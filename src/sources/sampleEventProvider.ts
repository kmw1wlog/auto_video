import type { SourceProvider } from "./types.js";
import { SampleSource } from "./sampleSource.js";
import type { NormalizedMarketEvent as ExistingNormalizedEvent } from "../types/event.js";
import { normalizeEvent } from "../normalize/normalizeEvent.js";
import type { StoryboardMarketEvent } from "../storyboard/types.js";

function toStoryboardEvent(event: ExistingNormalizedEvent): StoryboardMarketEvent {
  return {
    id: event.id,
    ticker: event.ticker,
    companyName: event.assetName,
    market: event.market,
    eventType: event.eventType === "sector_theme" ? "theme" : event.eventType,
    headline: event.headline,
    summary: event.summary,
    sourceUrls: [event.sourceUrl],
    numbers: [
      { label: "가격 변동", value: `${event.priceChangePercent.toFixed(1)}%` },
      { label: "거래량 변화", value: `${event.volumeChangePercent.toFixed(0)}%` },
      { label: "중요도", value: `${event.importanceScore}점` }
    ],
    keywords: [event.market, event.eventType, event.assetName].filter(Boolean),
    riskNotes: ["원문 확인", "거래량/수급 확인", "추가 공시 확인"],
    collectedAt: event.collectedAt,
    importanceScore: event.importanceScore
  };
}

export class SampleEventProvider implements SourceProvider<void, StoryboardMarketEvent[]> {
  name = "sample-event";

  isConfigured(): boolean {
    return true;
  }

  async fetch(): Promise<StoryboardMarketEvent[]> {
    const rawEvents = await new SampleSource(process.env.SAMPLE_EVENTS_PATH ?? "data/sample-events/market-detective-sample.json").loadEvents();
    return rawEvents.map((raw) => toStoryboardEvent(normalizeEvent(raw)));
  }
}
