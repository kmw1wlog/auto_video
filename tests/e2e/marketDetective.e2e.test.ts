import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { runMarketDetectiveSamplePipeline } from "../../src/workflow/runLocalPipeline.js";
import { validateScript } from "../../src/moderation/validateScript.js";

describe("market detective e2e", () => {
  it("전체 플로우를 실행하고 결과물을 생성", async () => {
    const result = await runMarketDetectiveSamplePipeline();
    const reviewJson = JSON.parse(await readFile(result.reviewJsonPath, "utf8"));
    const storyboard = JSON.parse(await readFile(result.storyboardPath, "utf8"));
    const dryRun = JSON.parse(await readFile(result.dryRunPublishPath, "utf8"));

    expect(existsSync(`data/output/${result.runId}`)).toBe(true);
    expect(existsSync(result.videoPath)).toBe(true);
    expect(statSync(result.videoPath).size).toBeGreaterThan(0);
    expect(existsSync(result.thumbnailPath)).toBe(true);
    expect(existsSync(result.reviewJsonPath)).toBe(true);
    expect(existsSync(result.reviewHtmlPath)).toBe(true);
    expect(existsSync(result.storyboardPath)).toBe(true);
    expect(existsSync(result.subtitlesPath)).toBe(true);
    expect(existsSync(result.assetLogPath)).toBe(true);
    expect(existsSync(result.dryRunPublishPath)).toBe(true);
    expect(reviewJson.readyForApproval).toBe(true);
    expect(reviewJson.channelId).toBe("market-detective");
    expect(storyboard.channel).toBe("market_detective");
    expect(storyboard.scenes).toHaveLength(7);
    expect(storyboard.scenes[0].kind).toBe("shock_hook");
    expect(storyboard.scenes[6].kind).toBe("cta");
    for (let index = 1; index < storyboard.scenes.length; index += 1) {
      expect(storyboard.scenes[index].startSec).toBeGreaterThanOrEqual(storyboard.scenes[index - 1].endSec);
    }
    expect(dryRun.mode).toBe("dry-run");
    expect(
      validateScript({
        narrationScript: storyboard.narrationScript,
        subtitles: storyboard.subtitles,
        instagramCaption: storyboard.instagramCaption
      }).moderationStatus
    ).toBe("passed");
  });
});
