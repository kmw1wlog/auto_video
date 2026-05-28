import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { InstagramDryRunPublisher } from "../../src/publish/instagramDryRunPublisher.js";
import { validateScript } from "../../src/moderation/validateScript.js";

describe("InstagramDryRunPublisher", () => {
  it("instagram-dry-run.json 생성", async () => {
    const runDir = path.join("data/output", `publisher-test-${Date.now()}`);
    await mkdir(runDir, { recursive: true });
    const videoPath = path.join(runDir, "video.mp4");
    await writeFile(videoPath, "not-a-real-video-but-exists");
    const outputPath = path.join(runDir, "instagram-dry-run.json");

    const result = await new InstagramDryRunPublisher().publish(
      {
        videoPath,
        caption: "시장탐정 테스트 caption\n본 영상은 투자 참고용입니다.",
        channelId: "market-detective"
      },
      outputPath
    );

    expect(existsSync(outputPath)).toBe(true);
    expect(result.mode).toBe("dry-run");
    expect(result.mediaType).toBe("REELS");
    expect(validateScript({ narrationScript: "", subtitles: [], instagramCaption: result.caption }).moderationStatus).toBe("passed");
  });
});
