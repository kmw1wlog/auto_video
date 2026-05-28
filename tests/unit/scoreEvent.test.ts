import { describe, expect, it } from "vitest";
import { scoreEvent } from "../../src/scoring/scoreEvent.js";

describe("scoreEvent", () => {
  it("disclosure는 높은 점수", () => {
    const score = scoreEvent({
      eventType: "disclosure",
      priceChangePercent: 2,
      volumeChangePercent: 60,
      market: "KR"
    });
    expect(score).toBeGreaterThanOrEqual(55);
  });

  it("price_move + 거래량 급증은 후보 기준 통과", () => {
    const score = scoreEvent({
      eventType: "price_move",
      priceChangePercent: -4.4,
      volumeChangePercent: 180,
      market: "US"
    });
    expect(score).toBeGreaterThanOrEqual(45);
  });

  it("낮은 변동성 이벤트는 낮은 점수", () => {
    const score = scoreEvent({
      eventType: "sector_theme",
      priceChangePercent: 0.2,
      volumeChangePercent: 10,
      market: "KR"
    });
    expect(score).toBeLessThan(45);
  });

  it("점수는 0~100 범위", () => {
    const score = scoreEvent({
      eventType: "earnings",
      priceChangePercent: 100,
      volumeChangePercent: 999,
      market: "US"
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
