import { existsSync } from "node:fs";
import type { PublishAdapter, PublishInput, PublishResult } from "./publishAdapter.js";
import { validateScript } from "../moderation/validateScript.js";
import { nowIso } from "../utils/time.js";
import { writeJsonFile } from "../utils/file.js";

export class InstagramDryRunPublisher implements PublishAdapter {
  async publish(input: PublishInput, outputPath?: string): Promise<PublishResult> {
    if (!existsSync(input.videoPath)) {
      throw new Error(`Instagram dry-run 실패: videoPath가 존재하지 않습니다. ${input.videoPath}`);
    }

    const moderation = validateScript({
      narrationScript: "",
      subtitles: [],
      instagramCaption: input.caption
    });
    if (moderation.moderationStatus === "failed") {
      throw new Error(`Instagram dry-run 실패: caption 금칙어 감지 - ${moderation.forbiddenWords.join(", ")}`);
    }

    const result: PublishResult = {
      platform: "instagram",
      mode: "dry-run",
      wouldPublish: true,
      mediaType: "REELS",
      videoPath: input.videoPath,
      caption: input.caption,
      createdAt: nowIso()
    };

    if (outputPath) {
      await writeJsonFile(outputPath, result);
    }

    return result;
  }
}
