import { createHash } from "node:crypto";
import { z } from "zod";
import type { NormalizedMarketEvent, RawMarketEvent } from "../types/event.js";
import { scoreEvent } from "../scoring/scoreEvent.js";
import { nowIso } from "../utils/time.js";

const RawMarketEventSchema = z.object({
  sourceName: z.string().min(1),
  sourceUrl: z.string().optional(),
  market: z.enum(["KR", "US"]),
  ticker: z.string().trim().min(1, "ticker is required"),
  assetName: z.string().min(1),
  headline: z.string().trim().min(1, "headline is required"),
  body: z.string().default(""),
  priceChangePercent: z.number(),
  volumeChangePercent: z.number(),
  eventType: z.enum(["news", "disclosure", "earnings", "price_move", "sector_theme"]),
  collectedAt: z.string()
});

export function normalizeEvent(input: RawMarketEvent, createdAt = nowIso()): NormalizedMarketEvent {
  const event = RawMarketEventSchema.parse(input);
  const id = createHash("sha256")
    .update(`${event.sourceName}|${event.ticker}|${event.headline}`)
    .digest("hex")
    .slice(0, 16);

  const normalized: NormalizedMarketEvent = {
    id,
    channelId: "market-detective",
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl?.trim() || "local-sample",
    market: event.market,
    ticker: event.ticker.trim(),
    assetName: event.assetName.trim(),
    headline: event.headline.trim(),
    summary: event.body.trim().slice(0, 300),
    eventType: event.eventType,
    priceChangePercent: event.priceChangePercent,
    volumeChangePercent: event.volumeChangePercent,
    importanceScore: 0,
    collectedAt: event.collectedAt,
    createdAt
  };

  return {
    ...normalized,
    importanceScore: scoreEvent(normalized)
  };
}
