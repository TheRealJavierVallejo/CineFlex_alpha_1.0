import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import { logEvent } from '../services/telemetry'; // IMPORTED

// Constants
const SELECTED_MODEL = "Llama-3-8B-Instruct-q4f32_1-MLC";
const DOWNLOAD_TIMEOUT_MS = 600000; // 10 minutes

interface LocalLlmContextType {
  isReady: boolean;
  isDownloading: boolean;
  isSupported: boolean;
  isModelCached: boolean;
  isCheckingCache: boolean;
  downloadProgress: number; // 0 to 100
  downloadText: string;
  error: string | null;
  initModel: () => Promise<void>;
  generateResponse: (prompt: string, history?: { role: string; content: string }[]) => Promise<string>;
  streamResponse: (prompt: string, history: { role: string; content: string }[], onUpdate: (chunk: string) => void) => Promise<void>;
}

const LocalLlmContext = createContext<LocalLlmContextType | undefined>(undefined);

export const LocalLlmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadText, setDownloadText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Cache state
  const [isModelCached, setIsModelCached] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(true);

  // Engine ref (Main Thread)
  const engine = useRef<MLCEngine | null>(null);

  // Check WebGPU, Security & Cache on mount
  useEffect(() => {
    logEvent('app_init'); // LOG INIT

    // 1. Check GPU
    if (!('gpu' in navigator)) {
      setIsSupported(false);
      setError("WebGPU is not supported in this browser. Local AI requires WebGPU.");
      setIsCheckingCache(false);
      return;
    }

    // 2. Check Security Headers (SharedArrayBuffer support)
    if (!window.crossOriginIsolated) {
      if (window.location.hostname === 'localhost') {
        console.warn("Localhost warning: Missing Cross-Origin headers. WebGPU might be unstable.");
      } else {
        setIsSupported(false);
        setError("Browser security restrictions detected. The app needs 'Cross-Origin-Opener-Policy' and 'Cross-Origin-Embedder-Policy' headers to run the AI engine.");
        setIsCheckingCache(false);
        return;
      }
    }

    // 3. Check Cache
    import("@mlc-ai/web-llm").then(({ hasModelInCache }) => {
      hasModelInCache(SELECTED_MODEL)
        .then((cached) => {
          setIsModelCached(cached);
        })
        .catch((e) => console.warn("Cache check failed", e))
        .finally(() => setIsCheckingCache(false));
    });

  }, []);

  const initModel = useCallback(async () => {
    if (engine.current && isReady) return;
    if (isDownloading) return;

    if (!isSupported) return;

    try {
      logEvent('model_download_start', { model: SELECTED_MODEL, cached: isModelCached }); // LOG START

      setIsDownloading(true);
      setError(null);
      setDownloadProgress(0);
      setDownloadText(isModelCached ? "Loading from disk..." : "Initializing engine...");

      // Cleanup existing engine if any
      if (engine.current) {
        try { await engine.current.unload(); } catch (e) { }
        engine.current = null;
      }

      const { MLCEngine } = await import("@mlc-ai/web-llm");
      engine.current = new MLCEngine();

      const onProgress = (report: InitProgressReport) => {
        const percent = Math.round(report.progress * 100);
        setDownloadProgress(percent);
        setDownloadText(report.text);
      };

      engine.current.setInitProgressCallback(onProgress);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Download timed out.")), DOWNLOAD_TIMEOUT_MS)
      );

      await Promise.race([
        engine.current.reload(SELECTED_MODEL),
        timeoutPromise
      ]);

      setIsReady(true);
      setIsDownloading(false);
      setDownloadText("Ready");
      setDownloadProgress(100);

      logEvent('model_download_success', { model: SELECTED_MODEL }); // LOG SUCCESS

    } catch (err: any) {
      console.error("LLM Init Error:", err);
      if (engine.current) {
        try { await engine.current.unload(); } catch (e) { }
        engine.current = null;
      }
      setError(err.message || "Failed to download model.");
      setIsDownloading(false);
      setDownloadText("Error");

      logEvent('model_download_fail', { error: err.message }); // LOG FAIL
    }
  }, [isReady, isDownloading, isSupported, isModelCached]);

  const generateResponse = useCallback(async (prompt: string, history: { role: string; content: string }[] = []) => {
    if (!engine.current) throw new Error("AI Engine not initialized");

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
  }, []);

  const streamResponse = useCallback(async (
    prompt: string,
    history: { role: string; content: string }[],
    onUpdate: (chunk: string) => void
  ) => {
    if (!engine.current) throw new Error("AI Engine not initialized");

    const messages = [
      ...history.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      { role: "user" as const, content: prompt }
    ];

    const completion = await engine.current.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) onUpdate(content);
    }
  }, []);

  return (
    <LocalLlmContext.Provider value={{
      isReady, isDownloading, isSupported, isModelCached, isCheckingCache,
      downloadProgress, downloadText, error,
      initModel, generateResponse, streamResponse
    }}>
      {children}
    </LocalLlmContext.Provider>
  );
};

export const useLocalLlm = () => {
  const context = useContext(LocalLlmContext);
  if (!context) throw new Error("useLocalLlm must be used within a LocalLlmProvider");
  return context;
};