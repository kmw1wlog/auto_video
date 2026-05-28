import path from "node:path";
import { z } from "zod";
import type { RawMarketEvent } from "../types/event.js";
import type { SourceAdapter } from "./sourceAdapter.js";
import { readJsonFile } from "../utils/file.js";

const RawMarketEventSchema = z.object({
  sourceName: z.string(),
  sourceUrl: z.string().optional(),
  market: z.enum(["KR", "US"]),
  ticker: z.string(),
  assetName: z.string(),
  headline: z.string(),
  body: z.string(),
  priceChangePercent: z.number(),
  volumeChangePercent: z.number(),
  eventType: z.enum(["news", "disclosure", "earnings", "price_move", "sector_theme"]),
  collectedAt: z.string()
});

export class SampleSource implements SourceAdapter {
  constructor(private readonly samplePath = "data/samples/market-events.sample.json") {}

  async loadEvents(): Promise<RawMarketEvent[]> {
    const absolutePath = path.resolve(process.cwd(), this.samplePath);
    const raw = await readJsonFile<unknown>(absolutePath);
    return z.array(RawMarketEventSchema).parse(raw);
  }
}
