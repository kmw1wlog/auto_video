import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";

export type AppEnv = {
  port: number;
  outputDir: string;
  sampleEventsPath: string;
  marketDetectiveMode: "full_auto" | "semi_manual";
  useOpenAiPlanner: boolean;
  useOpenAiTts: boolean;
  searchProvider: "perplexity" | "brave" | "none";
};

let loadedDotEnv = false;

function loadLocalDotEnv(): void {
  if (loadedDotEnv) return;
  loadedDotEnv = true;

  if (!existsSync(".env")) return;
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }
}

function boolEnv(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function loadEnv(): AppEnv {
  loadLocalDotEnv();
  const mode = process.env.MARKET_DETECTIVE_MODE === "semi_manual" ? "semi_manual" : "full_auto";
  const searchProvider = ["perplexity", "brave"].includes(process.env.SEARCH_PROVIDER ?? "")
    ? (process.env.SEARCH_PROVIDER as "perplexity" | "brave")
    : "none";

  return {
    port: Number(process.env.PORT ?? 3000),
    outputDir: process.env.OUTPUT_DIR ?? "data/output",
    sampleEventsPath:
      process.env.SAMPLE_EVENTS_PATH ?? "data/sample-events/market-detective-sample.json",
    marketDetectiveMode: mode,
    useOpenAiPlanner: boolEnv(process.env.USE_OPENAI_PLANNER),
    useOpenAiTts: boolEnv(process.env.USE_OPENAI_TTS),
    searchProvider
  };
}
