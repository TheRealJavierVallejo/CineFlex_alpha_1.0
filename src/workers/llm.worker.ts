import { MLCEngineWorkerHandler, MLCEngine } from "@mlc-ai/web-llm";

// The engine that runs the model
const engine = new MLCEngine();

// The handler that bridges the worker and the main thread
const handler = new MLCEngineWorkerHandler(engine);

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};