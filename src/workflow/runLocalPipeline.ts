import path from "node:path";
import { pathToFileURL } from "node:url";
import { getMarketDetectiveChannel } from "../config/channels.js";
import { loadEnv } from "../config/env.js";
import { SampleSource } from "../sources/sampleSource.js";
import { normalizeEvent } from "../normalize/normalizeEvent.js";
import { createMockReelPlan } from "../planning/mockPlanner.js";
import { validateScript } from "../moderation/validateScript.js";
import { createMockTtsAudio } from "../tts/mockTts.js";
import { LocalFfmpegRenderer } from "../render/localFfmpegRenderer.js";
import { createReviewPackage } from "../review/reviewPackage.js";
import { InstagramDryRunPublisher } from "../publish/instagramDryRunPublisher.js";
import { ensureDir } from "../utils/file.js";
import { resolveMascotPath } from "../utils/mascot.js";
import type { NormalizedMarketEvent } from "../types/event.js";

export type PipelineResult = {
  ok: true;
  runId: string;
  channelId: "market-detective";
  videoPath: string;
  thumbnailPath: string;
  reviewHtmlPath: string;
  reviewJsonPath: string;
  dryRunPublishPath: string;
  selectedEvent: NormalizedMarketEvent;
};

function runIdFromEvent(event: NormalizedMarketEvent): string {
  const match = event.collectedAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  const timestamp = match
    ? `${match[1]}${match[2]}${match[3]}-${match[4]}${match[5]}${match[6]}`
    : event.createdAt.replace(/[-:]/g, "").slice(0, 15);
  return `${timestamp}-${event.ticker}`;
}

export async function runMarketDetectiveSamplePipeline(): Promise<PipelineResult> {
  const env = loadEnv();
  const channel = getMarketDetectiveChannel();
  const source = new SampleSource(env.sampleEventsPath);
  const rawEvents = await source.loadEvents();
  const normalized = rawEvents.map((event) => normalizeEvent(event));
  const candidates = normalized
    .filter((event) => event.importanceScore >= 45)
    .sort((a, b) => b.importanceScore - a.importanceScore);

  if (candidates.length === 0) {
    throw new Error("시장탐정 후보 이벤트가 없습니다. importanceScore >= 45 조건을 만족하는 샘플이 필요합니다.");
  }

  const selectedEvent = candidates[0];
  const plan = createMockReelPlan(selectedEvent, channel);
  const moderation = validateScript(plan);
  if (moderation.moderationStatus === "failed") {
    throw new Error(`금칙어 검사 실패: ${moderation.forbiddenWords.join(", ")}`);
  }

  const runId = runIdFromEvent(selectedEvent);
  const runDir = path.join(env.outputDir, runId);
  await ensureDir(runDir);

  const audioPath = await createMockTtsAudio(runDir, 30);
  const mascotPath = await resolveMascotPath(channel.mascotPath, channel.fallbackMascotPath);
  const renderer = new LocalFfmpegRenderer();
  const renderResult = await renderer.render({
    channelId: "market-detective",
    title: plan.title,
    hook: plan.hook,
    scenes: plan.scenes,
    subtitles: plan.subtitles,
    mascotPath,
    audioPath,
    outputPath: path.join(runDir, "video.mp4"),
    disclaimer: plan.disclaimer,
    cta: plan.cta
  });

  const dryRunPublishPath = path.join(runDir, "instagram-dry-run.json");
  await new InstagramDryRunPublisher().publish(
    {
      videoPath: renderResult.videoPath,
      caption: plan.instagramCaption,
      channelId: "market-detective"
    },
    dryRunPublishPath
  );

  const reviewPackage = await createReviewPackage({
    runDir,
    event: selectedEvent,
    plan,
    renderResult
  });

  return {
    ok: true,
    runId,
    channelId: "market-detective",
    videoPath: renderResult.videoPath,
    thumbnailPath: renderResult.thumbnailPath,
    reviewHtmlPath: reviewPackage.reviewHtmlPath,
    reviewJsonPath: reviewPackage.reviewJsonPath,
    dryRunPublishPath,
    selectedEvent
  };
}

async function main(): Promise<void> {
  const result = await runMarketDetectiveSamplePipeline();
  console.log("");
  console.log("Market Detective sample pipeline completed.");
  console.log("");
  console.log(`Run ID: ${result.runId}`);
  console.log(`Video: ${result.videoPath}`);
  console.log(`Thumbnail: ${result.thumbnailPath}`);
  console.log(`Review: ${result.reviewHtmlPath}`);
  console.log(`Instagram dry-run: ${result.dryRunPublishPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
