import { describe, expect, it } from "vitest";
import { getMarketDetectiveChannel } from "../../src/config/channels.js";
import { normalizeEvent } from "../../src/normalize/normalizeEvent.js";
import { createMockReelPlan } from "../../src/planning/mockPlanner.js";
import { FORBIDDEN_WORDS } from "../../src/moderation/forbiddenWords.js";

describe("createMockReelPlan", () => {
  it("30초 구성과 필수 문구를 생성하고 금칙어를 포함하지 않음", () => {
    const event = normalizeEvent({
      sourceName: "sample_news",
      sourceUrl: "https://example.com/sample-3",
      market: "US",
      ticker: "NVDA",
      assetName: "NVIDIA",
      headline: "NVIDIA, 실적 발표 후 프리마켓 변동성 확대",
      body: "실적 발표 이후 AI 수요와 가이던스에 대한 시장 해석이 엇갈렸다.",
      priceChangePercent: 5.2,
      volumeChangePercent: 150,
      eventType: "earnings",
      collectedAt: "2026-05-28T21:00:00+09:00"
    });
    const plan = createMockReelPlan(event, getMarketDetectiveChannel());
    const fullText = `${plan.narrationScript}\n${plan.instagramCaption}`;

    expect(plan.scenes[0].startSec).toBe(0);
    expect(plan.scenes.at(-1)?.endSec).toBe(30);
    expect(plan.hook).toBeTruthy();
    expect(plan.cta).toBeTruthy();
    expect(plan.disclaimer).toBeTruthy();
    expect(FORBIDDEN_WORDS.some((word) => fullText.includes(word))).toBe(false);
  });
});
