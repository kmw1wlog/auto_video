import { describe, expect, it } from "vitest";
import { buildSubtitles } from "../../src/subtitles/subtitleBuilder.js";

describe("buildSubtitles", () => {
  it("자막 시간이 오름차순이고 30초 안에 들어오며 빈 자막이 없음", () => {
    const subtitles = buildSubtitles(
      "오늘 시장에서 큰 변동성이 포착됐습니다. 가격과 거래량을 함께 확인합니다. 원문과 공시를 같이 보며 리스크를 체크합니다.",
      30
    );

    expect(subtitles.length).toBeGreaterThan(0);
    for (const [index, subtitle] of subtitles.entries()) {
      expect(subtitle.text.trim()).not.toBe("");
      expect(subtitle.endSec).toBeGreaterThan(subtitle.startSec);
      if (index > 0) {
        expect(subtitle.startSec).toBeGreaterThanOrEqual(subtitles[index - 1].endSec);
      }
    }
    expect(subtitles.at(-1)?.endSec).toBeLessThanOrEqual(30);
  });
});
