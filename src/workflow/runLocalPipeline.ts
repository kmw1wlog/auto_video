import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnv } from "../config/env.js";
import { InstagramDryRunPublisher } from "../publish/instagramDryRunPublisher.js";
import { StoryboardFfmpegRenderer } from "../render/storyboardFfmpegRenderer.js";
import type { StoryboardRenderResult } from "../render/storyboardFfmpegRenderer.js";
import { createStoryboardReviewHtml } from "../review/createReviewHtml.js";
import { SampleEventProvider } from "../sources/sampleEventProvider.js";
import { OpenDartProvider } from "../sources/openDartProvider.js";
import { KisQuoteProvider } from "../sources/kisQuoteProvider.js";
import { WebSearchProvider } from "../sources/webSearchProvider.js";
import { createMarketDetectiveStoryboard } from "../storyboard/createMarketDetectiveStoryboard.js";
import type { StoryboardMarketEvent } from "../storyboard/types.js";
import { createNarrationAudio } from "../tts/openAiTts.js";
import { writeJsonFile } from "../utils/file.js";
import { ensureDir } from "../utils/file.js";

export type PipelineResult = {
  ok: true;
  runId: string;
  channelId: "market-detective";
  videoPath: string;
  thumbnailPath: string;
  reviewHtmlPath: string;
  reviewJsonPath: string;
  storyboardPath: string;
  subtitlesPath: string;
  assetLogPath: string;
  dryRunPublishPath: string;
  selectedEvent: StoryboardMarketEvent;
};

function runIdFromEvent(event: StoryboardMarketEvent): string {
  const match = event.collectedAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  const timestamp = match
    ? `${match[1]}${match[2]}${match[3]}-${match[4]}${match[5]}${match[6]}`
    : new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  return `${timestamp}-${event.ticker ?? "market"}`;
}

async function collectProviderUsage(event: StoryboardMarketEvent, searchProviderName: "perplexity" | "brave" | "none") {
  const dart = new OpenDartProvider();
  const kis = new KisQuoteProvider();
  const search = new WebSearchProvider(searchProviderName);

  const [dartResults, quote, searchResults] = await Promise.all([
    dart.fetch({ ticker: event.ticker }).catch(() => []),
    event.ticker ? kis.fetch({ ticker: event.ticker, market: event.market === "UNKNOWN" ? undefined : event.market }).catch(() => undefined) : Promise.resolve(undefined),
    search.fetch({ query: `${event.companyName ?? event.ticker ?? ""} 공시 급등 뉴스` }).catch(() => [])
  ]);

  return {
    usage: {
      openDart: dart.isConfigured() && dartResults.length > 0,
      kis: kis.isConfigured() && Boolean(quote),
      search: searchProviderName
    },
    enrichedSourceUrls: [
      ...event.sourceUrls,
      ...dartResults.map((result) => result.url),
      ...searchResults.map((result) => result.url)
    ].filter(Boolean)
  };
}

export async function runMarketDetectiveSamplePipeline(): Promise<PipelineResult> {
  const env = loadEnv();
  process.env.SAMPLE_EVENTS_PATH = env.sampleEventsPath;
  const source = new SampleEventProvider();
  const events = await source.fetch();
  const candidates = events
    .filter((event) => event.importanceScore >= 45)
    .sort((a, b) => b.importanceScore - a.importanceScore);

  if (candidates.length === 0) {
    throw new Error("시장탐정 후보 이벤트가 없습니다. importanceScore >= 45 조건을 만족하는 샘플이 필요합니다.");
  }

  const selectedEvent = candidates[0];
  const runId = runIdFromEvent(selectedEvent);
  const runDir = path.join(env.outputDir, runId);
  await ensureDir(runDir);

  const provider = await collectProviderUsage(selectedEvent, env.searchProvider);
  const storyboard = await createMarketDetectiveStoryboard({
    runDir,
    runId,
    event: {
      ...selectedEvent,
      sourceUrls: provider.enrichedSourceUrls
    },
    mode: env.marketDetectiveMode,
    useOpenAiPlanner: env.useOpenAiPlanner,
    providerUsage: provider.usage
  });

  const tts = await createNarrationAudio({
    outputDir: runDir,
    narrationScript: storyboard.narrationScript,
    durationSec: 30,
    useOpenAiTts: env.useOpenAiTts
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

  const reviewJsonPath = path.join(runDir, "review.json");
  await writeJsonFile(reviewJsonPath, {
    channelId: "market-detective",
    title: storyboard.title,
    event: selectedEvent,
    storyboardPath: renderResult.storyboardPath,
    videoPath: renderResult.videoPath,
    thumbnailPath: renderResult.thumbnailPath,
    sourceUrls: storyboard.sourceUrls,
    moderationStatus: storyboard.moderation.passed ? "passed" : "needs_review",
    readyForApproval: storyboard.moderation.passed
  });
  const reviewHtmlPath = await createStoryboardReviewHtml({ runDir, storyboard, renderResult });

  return {
    ok: true,
    runId,
    channelId: "market-detective",
    videoPath: renderResult.videoPath,
    thumbnailPath: renderResult.thumbnailPath,
    reviewHtmlPath,
    reviewJsonPath,
    storyboardPath: renderResult.storyboardPath,
    subtitlesPath: renderResult.subtitlesPath,
    assetLogPath: renderResult.assetLogPath,
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
  console.log(`Storyboard: ${result.storyboardPath}`);
  console.log(`Subtitles: ${result.subtitlesPath}`);
  console.log(`Asset log: ${result.assetLogPath}`);
  console.log(`Instagram dry-run: ${result.dryRunPublishPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
