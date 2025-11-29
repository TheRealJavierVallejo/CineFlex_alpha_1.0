import { MLCEngineWorkerHandler, MLCEngine } from "@mlc-ai/web-llm";

console.log("LLM Worker: Launching...");

// Global error safety
self.onerror = (err) => {
    console.error("LLM Worker GLOBAL Error:", err);
};

try {
    // The engine that runs the model
    const engine = new MLCEngine();

    // The handler that bridges the worker and the main thread
    const handler = new MLCEngineWorkerHandler(engine);

    self.onmessage = (msg: MessageEvent) => {
        handler.onmessage(msg);
    };

    console.log("LLM Worker: Ready and listening.");
} catch (error) {
    console.error("LLM Worker: CRITICAL STARTUP ERROR", error);
    // Depending on the error, we might be able to post it back
    // But usually startup errors kill the worker before listeners are active.
    throw error;
}