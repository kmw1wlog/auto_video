import type { NormalizedMarketEvent, RawMarketEvent } from "../types/event.js";

type ScorableEvent = Pick<
  NormalizedMarketEvent | RawMarketEvent,
  "eventType" | "priceChangePercent" | "volumeChangePercent" | "market"
>;

const EVENT_TYPE_WEIGHTS: Record<ScorableEvent["eventType"], number> = {
  disclosure: 35,
  earnings: 30,
  price_move: 25,
  news: 20,
  sector_theme: 15
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function scoreEvent(event: ScorableEvent): number {
  const absPriceMove = Math.abs(event.priceChangePercent);
  let score = 10 + EVENT_TYPE_WEIGHTS[event.eventType];

  if (absPriceMove >= 5) score += 25;
  else if (absPriceMove >= 3) score += 15;
  else if (absPriceMove >= 1) score += 5;

  if (event.volumeChangePercent >= 150) score += 25;
  else if (event.volumeChangePercent >= 100) score += 15;
  else if (event.volumeChangePercent >= 50) score += 5;

  if (event.market === "US" || event.market === "KR") score += 5;

  return clampScore(score);
}

export function isReelsCandidate(event: ScorableEvent): boolean {
  return scoreEvent(event) >= 45;
}
