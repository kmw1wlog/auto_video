import path from "node:path";
import type { NormalizedMarketEvent } from "../types/event.js";
import type { ReelPlan, ReviewPackage } from "../types/reel.js";
import type { RenderResult } from "../types/render.js";
import { ensureDir, writeJsonFile, writeTextFile } from "../utils/file.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function createReviewPackage(input: {
  runDir: string;
  event: NormalizedMarketEvent;
  plan: ReelPlan;
  renderResult: RenderResult;
}): Promise<{ reviewJsonPath: string; reviewHtmlPath: string; review: ReviewPackage }> {
  await ensureDir(input.runDir);
  const reviewJsonPath = path.join(input.runDir, "review.json");
  const reviewHtmlPath = path.join(input.runDir, "review.html");

  const review: ReviewPackage = {
    channelId: "market-detective",
    title: input.plan.title,
    event: input.event,
    script: input.plan,
    videoPath: input.renderResult.videoPath,
    thumbnailPath: input.renderResult.thumbnailPath,
    sourceUrl: input.event.sourceUrl,
    moderationStatus: "passed",
    readyForApproval: true
  };

  const subtitles = input.plan.subtitles
    .map((line) => `<li>${line.startSec.toFixed(1)}~${line.endSec.toFixed(1)}s ${escapeHtml(line.text)}</li>`)
    .join("\n");

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.plan.title)} Review</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #111; color: #fff; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px 56px; }
    video { width: min(360px, 100%); aspect-ratio: 9 / 16; background: #000; display: block; }
    a { color: #FFD43B; }
    section { border-top: 1px solid #333; padding-top: 20px; margin-top: 24px; }
    pre { white-space: pre-wrap; background: #1d1d1d; padding: 16px; overflow: auto; }
    button { border: 0; padding: 10px 14px; margin-right: 8px; font-weight: 700; }
    .approve { background: #18A058; color: white; }
    .reject { background: #444; color: white; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(input.plan.title)}</h1>
    <video controls src="./video.mp4" poster="./thumbnail.png"></video>
    <section>
      <h2>Source</h2>
      <a href="${escapeHtml(input.event.sourceUrl)}">${escapeHtml(input.event.sourceUrl)}</a>
    </section>
    <section>
      <h2>Script</h2>
      <pre>${escapeHtml(input.plan.narrationScript)}</pre>
    </section>
    <section>
      <h2>Subtitles</h2>
      <ul>${subtitles}</ul>
    </section>
    <section>
      <h2>Instagram Caption</h2>
      <pre>${escapeHtml(input.plan.instagramCaption)}</pre>
    </section>
    <section>
      <button class="approve">Approve</button>
      <button class="reject">Reject</button>
    </section>
  </main>
</body>
</html>
`;

  await writeJsonFile(reviewJsonPath, review);
  await writeTextFile(reviewHtmlPath, html);

  return {
    reviewJsonPath,
    reviewHtmlPath,
    review
  };
}
