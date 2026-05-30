import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnv } from "../config/env.js";
import { createKieMascotMotionTask } from "../integrations/kieMarketClient.js";
import { InstagramDryRunPublisher } from "../publish/instagramDryRunPublisher.js";
import type { StoryboardRenderResult } from "../render/storyboardFfmpegRenderer.js";
import { StoryboardFfmpegRenderer } from "../render/storyboardFfmpegRenderer.js";
import { createYoutubeAutomationNotes } from "../reference/youtubeAutomationNotes.js";
import { createStoryboardReviewHtml } from "../review/createReviewHtml.js";
import { ContentCsvProvider, selectNextContentRow } from "../sources/contentCsvProvider.js";
import { WebSearchProvider } from "../sources/webSearchProvider.js";
import { createContentSheetStoryboard } from "../storyboard/createContentSheetStoryboard.js";
import { createNarrationAudio } from "../tts/openAiTts.js";
import { ensureDir, writeJsonFile } from "../utils/file.js";

export type ContentSheetPipelineResult = {
  ok: true;
  runId: string;
  videoPath: string;
  reviewHtmlPath: string;
  storyboardPath: string;
  dryRunPublishPath: string;
  selectedRowId: string;
};

function runIdFromRow(id: string): string {
  return `content-${id || new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}`;
}

async function maybeCreateAutomationNotes(): Promise<{ notes?: string; notesPath?: string; provider: "gemini" | "fallback" | "none"; error?: string }> {
  const vttPath = process.env.YOUTUBE_TRANSCRIPT_VTT_PATH ?? "data/youtube/vs3Dk9tO0do.ko.vtt";
  try {
    const result = await createYoutubeAutomationNotes({ vttPath });
    return {
      notes: await readFile(result.notesPath, "utf8"),
      notesPath: result.notesPath,
      provider: result.provider,
      error: result.error
    };
  } catch {
    return { provider: "none" };
  }
}

function boolEnv(value: string | undefined): boolean {
  return value !== undefined && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export async function runContentSheetPipeline(): Promise<ContentSheetPipelineResult> {
  const env = loadEnv();
  const rows = await new ContentCsvProvider(env.contentCsvPath).fetch();
  const selectedRow = selectNextContentRow(rows);
  const runId = runIdFromRow(selectedRow.id);
  const runDir = path.join(env.outputDir, runId);
  await ensureDir(runDir);

  const notes = await maybeCreateAutomationNotes();
  const search = new WebSearchProvider(env.searchProvider);
  const searchResults = await search.fetch({ query: `${selectedRow.title} ${selectedRow.keyword}` }).catch(() => []);
  const sourceUrls = [
    selectedRow.videoUrl,
    ...searchResults.map((result) => result.url)
  ].filter(Boolean);

  const storyboard = await createContentSheetStoryboard({
    runDir,
    runId,
    row: selectedRow,
    mode: env.marketDetectiveMode,
    useOpenAiPlanner: env.useOpenAiPlanner,
    sourceUrls,
    searchProvider: env.searchProvider,
    automationNotes: notes.notes
  });

  const tts = await createNarrationAudio({
    outputDir: runDir,
    narrationScript: storyboard.narrationScript,
    durationSec: 30,
    useOpenAiTts: env.useOpenAiTts,
    voiceId: selectedRow.voiceId,
    voiceName: selectedRow.voice
  });
  storyboard.providerUsage.tts = tts.mode;

  const renderResult: StoryboardRenderResult = await new StoryboardFfmpegRenderer().render({
    storyboard,
    runDir,
    audioPath: tts.audioPath
  });

  const dryRunPublishPath = path.join(runDir, "instagram-dry-run.json");
  await new InstagramDryRunPublisher().publish(
    {
      videoPath: renderResult.videoPath,
      caption: storyboard.instagramCaption,
      channelId: "market-detective"
    },
    dryRunPublishPath
  );

  await writeJsonFile(path.join(runDir, "social-publish-dry-run.json"), {
    mode: "dry-run",
    reason: "User requested not to post automatically.",
    platforms: ["instagram", "threads", "youtube"],
    buffer: {
      enabled: Boolean(process.env.BUFFER_ACCESS_TOKEN),
      action: "not-called",
      caption: storyboard.instagramCaption,
      mediaPath: renderResult.videoPath
    },
    creatomate: {
      enabled: Boolean(process.env.CREATOMATE_API_KEY),
      action: "not-called",
      renderInput: {
        videoSource: renderResult.videoPath,
        subtitleSource: renderResult.subtitlesPath
      }
    },
    kie: {
      enabled: Boolean(process.env.KIE_API_KEY),
      action: "payload-prepared-only",
      klingImageToVideo: {
        model: process.env.KIE_KLING_IMAGE_TO_VIDEO_MODEL ?? "kling-2.6/image-to-video",
        input: {
          prompt: "Mascot detective pops in, points at the headline card, then exits. Clean sticker-style motion, no sound.",
          image_urls: [process.env.MASCOT_SOURCE_IMAGE_URL].filter(Boolean),
          sound: false,
          duration: "5"
        }
      }
    },
    youtubeAutomationNotes: notes
  });

  let kieTask: unknown = { skipped: true, reason: "USE_KIE_MASCOT_TASK is not enabled." };
  if (boolEnv(process.env.USE_KIE_MASCOT_TASK)) {
    try {
      kieTask = await createKieMascotMotionTask();
    } catch (error) {
      kieTask = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  await writeJsonFile(path.join(runDir, "kie-mascot-task.json"), kieTask);

  const reviewJsonPath = path.join(runDir, "review.json");
  await writeJsonFile(reviewJsonPath, {
    channelId: "content-sheet-reels",
    title: storyboard.title,
    selectedRow,
    storyboardPath: renderResult.storyboardPath,
    videoPath: renderResult.videoPath,
    thumbnailPath: renderResult.thumbnailPath,
    sourceUrls,
    searchResults,
    automationNotesPath: notes.notesPath,
    moderationStatus: storyboard.moderation.passed ? "passed" : "needs_review",
    readyForApproval: storyboard.moderation.passed
  });
  const reviewHtmlPath = await createStoryboardReviewHtml({ runDir, storyboard, renderResult });

  return {
    ok: true,
    runId,
    videoPath: renderResult.videoPath,
    reviewHtmlPath,
    storyboardPath: renderResult.storyboardPath,
    dryRunPublishPath,
    selectedRowId: selectedRow.id
  };
}

async function main(): Promise<void> {
  const result = await runContentSheetPipeline();
  console.log("");
  console.log("Content sheet reels pipeline completed.");
  console.log("");
  console.log(`Run ID: ${result.runId}`);
  console.log(`Selected row: ${result.selectedRowId}`);
  console.log(`Video: ${result.videoPath}`);
  console.log(`Review: ${result.reviewHtmlPath}`);
  console.log(`Storyboard: ${result.storyboardPath}`);
  console.log(`Publish dry-run: ${result.dryRunPublishPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
