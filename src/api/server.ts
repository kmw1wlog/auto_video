import express from "express";
import { loadEnv } from "../config/env.js";
import { marketDetectiveRoutes } from "./routes.js";

export function createServer() {
  const app = express();
  app.use(express.json());
  app.use(marketDetectiveRoutes());
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  });
  return app;
}

const env = loadEnv();

if (process.argv[1]?.endsWith("server.ts")) {
  createServer().listen(env.port, () => {
    console.log(`Market Detective API listening on http://localhost:${env.port}`);
  });
}
