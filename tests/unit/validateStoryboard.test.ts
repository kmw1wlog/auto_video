import { describe, expect, it } from "vitest";
import { createMockStoryboard } from "../../src/planner/mockStoryboardPlanner.js";
import { validateStoryboard } from "../../src/storyboard/validateStoryboard.js";
import type { StoryboardMarketEvent } from "../../src/storyboard/types.js";

const event: StoryboardMarketEvent = {
  id: "event-1",
  ticker: "NVDA",
  companyName: "NVIDIA",
  market: "US",
  eventType: "earnings",
  headline: "NVIDIA, 실적 발표 후 변동성 확대",
  summary: "실적 발표 이후 AI 수요와 가이던스에 대한 시장 해석이 엇갈렸다.",
  sourceUrls: ["https://example.com/nvda"],
  numbers: [
    { label: "등락률", value: "5.2%" },
    { label: "거래량", value: "150%" }
  ],
  keywords: ["AI", "실적"],
  riskNotes: ["원문 공시 확인"],
  collectedAt: "2026-05-28T21:00:00+09:00",
  importanceScore: 95
};

describe("validateStoryboard", () => {
  it("7개 scene과 겹치지 않는 시간을 통과시킨다", () => {
    const storyboard = createMockStoryboard({ runId: "test-run", event, mode: "full_auto" });
    expect(validateStoryboard(storyboard)).toEqual([]);
    expect(storyboard.scenes).toHaveLength(7);
  });

  it("scene 시간이 겹치면 오류를 반환한다", () => {
    const storyboard = createMockStoryboard({ runId: "test-run", event, mode: "full_auto" });
    storyboard.scenes[1].startSec = 1;
    expect(validateStoryboard(storyboard).join(" ")).toContain("overlaps");
  });
});
