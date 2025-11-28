import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { WebWorkerMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
// Explicit Vite worker import
import LLMWorker from '../workers/llm.worker.ts?worker';

// Constants
const SELECTED_MODEL = "Llama-3-8B-Instruct-q4f32_1-MLC"; 

interface LocalLlmContextType {
  isReady: boolean;
  isDownloading: boolean;
  isSupported: boolean;
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

  // Engine ref
  const engine = useRef<WebWorkerMLCEngine | null>(null);
  const workerRef = useRef<Worker | null>(null);

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
      setDownloadProgress(0);
      setDownloadText("Initializing engine...");

      // Cleanup existing worker if any (Hard Reset)
      if (engine.current || workerRef.current) {
         engine.current?.unload();
         workerRef.current?.terminate();
         engine.current = null;
         workerRef.current = null;
      }

      // Create new worker
      const worker = new LLMWorker();
      workerRef.current = worker;

      worker.onerror = (e) => {
          console.error("Worker startup error:", e);
          const msg = e instanceof ErrorEvent ? e.message : "Worker failed to start.";
          setError(`Worker Error: ${msg}`);
          setIsDownloading(false);
      };

      engine.current = new WebWorkerMLCEngine(worker);

      const onProgress = (report: InitProgressReport) => {
        const percent = Math.round(report.progress * 100);
        setDownloadProgress(percent);
        setDownloadText(report.text);
      };

      engine.current.setInitProgressCallback(onProgress);

      // SAFETY TIMEOUT: 60s
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Engine timed out. Please refresh and try again.")), 60000)
      );

      await Promise.race([
        engine.current.reload(SELECTED_MODEL),
        timeoutPromise
      ]);

      setIsReady(true);
      setIsDownloading(false);
      setDownloadText("Ready");
      setDownloadProgress(100);

    } catch (err: any) {
      console.error("LLM Init Error:", err);
      // Clean up on error
      if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
          engine.current = null;
      }
      setError(err.message || "Failed to download model.");
      setIsDownloading(false);
      setDownloadText("Error");
    }
  }, [isReady, isDownloading, isSupported]);

  const generateResponse = useCallback(async (prompt: string, history: { role: string; content: string }[] = []) => {
    if (!engine.current || !isReady) {
      throw new Error("AI Engine not ready");
    }

    const messages = [
      ...history.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      { role: "user" as const, content: prompt }
    ];

    const reply = await engine.current.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 600, 
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