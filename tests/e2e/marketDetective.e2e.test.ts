import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { runMarketDetectiveSamplePipeline } from "../../src/workflow/runLocalPipeline.js";
import { validateScript } from "../../src/moderation/validateScript.js";

describe("market detective e2e", () => {
  it("전체 플로우를 실행하고 결과물을 생성", async () => {
    const result = await runMarketDetectiveSamplePipeline();
    const reviewJson = JSON.parse(await readFile(result.reviewJsonPath, "utf8"));
    const dryRun = JSON.parse(await readFile(result.dryRunPublishPath, "utf8"));

    expect(existsSync(`data/output/${result.runId}`)).toBe(true);
    expect(existsSync(result.videoPath)).toBe(true);
    expect(statSync(result.videoPath).size).toBeGreaterThan(0);
    expect(existsSync(result.thumbnailPath)).toBe(true);
    expect(existsSync(result.reviewJsonPath)).toBe(true);
    expect(existsSync(result.reviewHtmlPath)).toBe(true);
    expect(existsSync(result.dryRunPublishPath)).toBe(true);
    expect(reviewJson.readyForApproval).toBe(true);
    expect(reviewJson.channelId).toBe("market-detective");
    expect(dryRun.mode).toBe("dry-run");
    expect(
      validateScript({
        narrationScript: reviewJson.script.narrationScript,
        subtitles: reviewJson.script.subtitles,
        instagramCaption: reviewJson.script.instagramCaption
      }).moderationStatus
    ).toBe("passed");
  });
});
