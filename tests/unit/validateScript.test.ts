import { describe, expect, it } from "vitest";
import { validateScript } from "../../src/moderation/validateScript.js";

describe("validateScript", () => {
  it("금칙어 포함 시 실패", () => {
    const result = validateScript({
      narrationScript: "지금 사세요 라는 표현은 금지입니다.",
      subtitles: [],
      instagramCaption: "테스트"
    });
    expect(result.moderationStatus).toBe("failed");
  });

  it("정상 대본 통과", () => {
    const result = validateScript({
      narrationScript: "시장 이슈를 원문 기준으로 확인합니다.",
      subtitles: [{ startSec: 0, endSec: 2, text: "시장 이슈 확인" }],
      instagramCaption: "본 영상은 투자 참고용입니다."
    });
    expect(result.moderationStatus).toBe("passed");
  });
});
