import { describe, expect, it } from "vitest";
import { normalizeEvent } from "../../src/normalize/normalizeEvent.js";
import type { RawMarketEvent } from "../../src/types/event.js";

const baseEvent: RawMarketEvent = {
  sourceName: "sample_news",
  sourceUrl: "https://example.com/a",
  market: "KR",
  ticker: "005930",
  assetName: "삼성전자",
  headline: "삼성전자, AI 반도체 기대감에 거래량 증가",
  body: "AI 반도체 관련 기대감과 외국인 수급 변화로 시장 관심이 확대됐다.",
  priceChangePercent: 3.8,
  volumeChangePercent: 120,
  eventType: "news",
  collectedAt: "2026-05-28T09:00:00+09:00"
};

describe("normalizeEvent", () => {
  it("ticker가 없으면 실패", () => {
    expect(() => normalizeEvent({ ...baseEvent, ticker: "" })).toThrow();
  });

  it("headline이 없으면 실패", () => {
    expect(() => normalizeEvent({ ...baseEvent, headline: "" })).toThrow();
  });

  it("같은 입력은 같은 id 생성", () => {
    const first = normalizeEvent(baseEvent);
    const second = normalizeEvent(baseEvent);
    expect(first.id).toBe(second.id);
  });

  it("body는 summary로 축약", () => {
    const longBody = "가".repeat(400);
    const normalized = normalizeEvent({ ...baseEvent, body: longBody });
    expect(normalized.summary).toHaveLength(300);
  });

  it("sourceUrl이 없으면 local-sample로 대체", () => {
    const normalized = normalizeEvent({ ...baseEvent, sourceUrl: undefined });
    expect(normalized.sourceUrl).toBe("local-sample");
  });
});
