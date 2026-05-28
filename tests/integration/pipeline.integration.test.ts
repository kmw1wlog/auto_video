import { describe, expect, it } from "vitest";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import { SampleSource } from "../../src/sources/sampleSource.js";
import { normalizeEvent } from "../../src/normalize/normalizeEvent.js";
import { createMockReelPlan } from "../../src/planning/mockPlanner.js";
import { getMarketDetectiveChannel } from "../../src/config/channels.js";
import { validateScript } from "../../src/moderation/validateScript.js";
import { createReviewPackage } from "../../src/review/reviewPackage.js";

describe("pipeline integration", () => {
  it("샘플 후보 선택, ReelPlan 생성, moderation 통과, review package 생성", async () => {
    const events = await new SampleSource().loadEvents();
    const normalized = events.map((event) => normalizeEvent(event));
    const candidates = normalized
      .filter((event) => event.importanceScore >= 45)
      .sort((a, b) => b.importanceScore - a.importanceScore);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].importanceScore).toBe(Math.max(...normalized.map((event) => event.importanceScore)));

    const plan = createMockReelPlan(candidates[0], getMarketDetectiveChannel());
    expect(plan.channelId).toBe("market-detective");
    expect(validateScript(plan).moderationStatus).toBe("passed");

    const runDir = await mkdtemp(path.join(os.tmpdir(), "market-review-"));
    const review = await createReviewPackage({
      runDir,
      event: candidates[0],
      plan,
      renderResult: {
        videoPath: path.join(runDir, "video.mp4"),
        thumbnailPath: path.join(runDir, "thumbnail.png"),
        durationSec: 30,
        width: 1080,
        height: 1920,
        status: "done"
      }
    });
    expect(review.review.readyForApproval).toBe(true);
    expect(review.review.channelId).toBe("market-detective");
  });
});
