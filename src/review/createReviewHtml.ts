import path from "node:path";
import type { ReelStoryboard } from "../storyboard/types.js";
import type { StoryboardRenderResult } from "../render/storyboardFfmpegRenderer.js";
import { writeTextFile } from "../utils/file.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function createStoryboardReviewHtml(input: {
  runDir: string;
  storyboard: ReelStoryboard;
  renderResult: StoryboardRenderResult;
  referenceAnalysisPath?: string;
}): Promise<string> {
  const reviewHtmlPath = path.join(input.runDir, "review.html");
  const scenes = input.storyboard.scenes
    .map(
      (scene) => `<tr>
        <td>${escapeHtml(scene.id)}</td>
        <td>${scene.startSec.toFixed(1)}-${scene.endSec.toFixed(1)}s</td>
        <td>${escapeHtml(scene.headline)}<br><small>${escapeHtml(scene.bodyLines.join(" / "))}</small></td>
        <td>${escapeHtml(scene.subtitle)}</td>
        <td>${escapeHtml(scene.assetSource)}<br><small>${escapeHtml(scene.assetPath ?? "-")}</small></td>
        <td>${escapeHtml(scene.mascotAction)}<br><small>${escapeHtml(scene.mascotClipPath ?? "-")}</small></td>
      </tr>`
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.storyboard.title)} Review</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #111; color: #f7f7f7; }
    main { max-width: 1120px; margin: 0 auto; padding: 28px 20px 56px; }
    video { width: min(390px, 100%); aspect-ratio: 9 / 16; background: #000; display: block; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #333; padding: 10px; vertical-align: top; }
    th { background: #242424; }
    pre { white-space: pre-wrap; background: #1d1d1d; padding: 16px; overflow: auto; }
    a { color: #FFD43B; }
    .grid { display: grid; grid-template-columns: minmax(260px, 400px) 1fr; gap: 28px; align-items: start; }
    .pill { display: inline-block; border: 1px solid #444; padding: 4px 8px; margin: 2px; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(input.storyboard.title)}</h1>
    <div class="grid">
      <video controls src="./video.mp4" poster="./thumbnail.png"></video>
      <section>
        <h2>Scene Grammar</h2>
        <p>Shock Hook -> Detective Intro -> What Happened -> Why It Matters -> Detective Reaction -> Checkpoint -> CTA</p>
        <p>
          <span class="pill">OpenAI: ${input.storyboard.providerUsage.openAi ? "used" : "mock/fallback"}</span>
          <span class="pill">OpenDART: ${input.storyboard.providerUsage.openDart ? "used" : "not used"}</span>
          <span class="pill">KIS: ${input.storyboard.providerUsage.kis ? "used" : "not used"}</span>
          <span class="pill">Search: ${input.storyboard.providerUsage.search}</span>
          <span class="pill">TTS: ${input.storyboard.providerUsage.tts}</span>
        </p>
        <h2>Moderation</h2>
        <p>${input.storyboard.moderation.passed ? "passed" : "needs review"}</p>
        <pre>${escapeHtml(JSON.stringify(input.storyboard.moderation, null, 2))}</pre>
      </section>
    </div>
    <section>
      <h2>Scenes</h2>
      <table>
        <thead><tr><th>ID</th><th>Time</th><th>Headline / Body</th><th>Subtitle</th><th>Asset</th><th>Mascot</th></tr></thead>
        <tbody>${scenes}</tbody>
      </table>
    </section>
    <section>
      <h2>Source URLs</h2>
      <pre>${escapeHtml(input.storyboard.sourceUrls.join("\n") || "No external source URL")}</pre>
    </section>
    <section>
      <h2>Instagram Caption Preview</h2>
      <pre>${escapeHtml(input.storyboard.instagramCaption)}</pre>
    </section>
    <section>
      <h2>Storyboard JSON</h2>
      <pre>${escapeHtml(JSON.stringify(input.storyboard, null, 2))}</pre>
    </section>
  </main>
</body>
</html>
`;

  await writeTextFile(reviewHtmlPath, html);
  return reviewHtmlPath;
}
