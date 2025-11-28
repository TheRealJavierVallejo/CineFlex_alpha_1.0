import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

// Constants
const SELECTED_MODEL = "Llama-3-8B-Instruct-q4f32_1-MLC"; // Good balance of speed/quality

interface LocalLlmContextType {
  isReady: boolean;
  isDownloading: boolean;
  isSupported: boolean; // New flag
  downloadProgress: number; // 0 to 100
  downloadText: string;
  error: string | null;
  initModel: () => Promise<void>;
  generateResponse: (prompt: string, history?: { role: string; content: string }[]) => Promise<string>;
}

const LocalLlmContext = createContext<LocalLlmContextType | undefined>(undefined);

export const LocalLlmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadText, setDownloadText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Engine ref to persist across renders
  const engine = useRef<WebWorkerMLCEngine | null>(null);

  // Check WebGPU support on mount
  useEffect(() => {
    if (!navigator.gpu) {
      setIsSupported(false);
      setError("WebGPU is not supported in this browser. Local AI requires WebGPU.");
    }
  }, []);

  const initModel = useCallback(async () => {
    if (isReady || isDownloading) return;
    if (!isSupported) {
        setError("Cannot start AI: WebGPU not supported.");
        return;
    }

    try {
      setIsDownloading(true);
      setError(null);

      // Initialize the worker
      if (!engine.current) {
        // We assume the worker file is at the correct path relative to public/assets or built via Vite
        const worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url), { type: 'module' });
        engine.current = new WebWorkerMLCEngine(worker);
      }

      // Progress callback
      const onProgress = (report: InitProgressReport) => {
        const percent = Math.round(report.progress * 100);
        setDownloadProgress(percent);
        setDownloadText(report.text);
      };

      engine.current.setInitProgressCallback(onProgress);

      // Start loading
      await engine.current.reload(SELECTED_MODEL);

      setIsReady(true);
      setIsDownloading(false);
    } catch (err: any) {
      console.error("LLM Init Error:", err);
      setError(err.message || "Failed to download model.");
      setIsDownloading(false);
    }
  }, [isReady, isDownloading, isSupported]);

  const generateResponse = useCallback(async (prompt: string, history: { role: string; content: string }[] = []) => {
    if (!engine.current || !isReady) {
      throw new Error("AI Engine not ready");
    }

    // Convert history format if needed
    const messages = [
      ...history.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      { role: "user" as const, content: prompt }
    ];

    const reply = await engine.current.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 600, // Increased slightly for better creative output
    });

    return reply.choices[0]?.message?.content || "";
  }, [isReady]);

  return (
    <LocalLlmContext.Provider value={{
      isReady,
      isDownloading,
      isSupported,
      downloadProgress,
      downloadText,
      error,
      initModel,
      generateResponse
    }}>
      {children}
    </LocalLlmContext.Provider>
  );
};

export const useLocalLlm = () => {
  const context = useContext(LocalLlmContext);
  if (!context) {
    throw new Error("useLocalLlm must be used within a LocalLlmProvider");
  }
  return context;
};