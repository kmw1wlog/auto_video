import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Router } from "express";
import { Router as createRouter } from "express";
import { loadEnv } from "../config/env.js";
import { readJsonFile } from "../utils/file.js";
import { runMarketDetectiveSamplePipeline } from "../workflow/runLocalPipeline.js";

async function latestRunId(outputDir: string): Promise<string | undefined> {
  const entries = await readdir(outputDir, { withFileTypes: true }).catch(() => []);
  const directories = entries.filter((entry) => entry.isDirectory());
  const withStats = await Promise.all(
    directories.map(async (entry) => ({
      name: entry.name,
      modifiedMs: (await stat(path.join(outputDir, entry.name))).mtimeMs
    }))
  );
  return withStats.sort((a, b) => b.modifiedMs - a.modifiedMs)[0]?.name;
}

export function marketDetectiveRoutes(): Router {
  const router = createRouter();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "market-detective-reels" });
  });

  router.post("/api/market-detective/run-sample", async (_req, res, next) => {
    try {
      const result = await runMarketDetectiveSamplePipeline();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/market-detective/runs/latest", async (_req, res, next) => {
    try {
      const env = loadEnv();
      const runId = await latestRunId(env.outputDir);
      if (!runId) {
        res.status(404).json({ ok: false, error: "No runs found" });
        return;
      }
      const review = await readJsonFile(path.join(env.outputDir, runId, "review.json"));
      res.json({ ok: true, runId, review });
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/market-detective/runs/:runId", async (req, res, next) => {
    try {
      const env = loadEnv();
      const review = await readJsonFile(path.join(env.outputDir, req.params.runId, "review.json"));
      res.json({ ok: true, runId: req.params.runId, review });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
