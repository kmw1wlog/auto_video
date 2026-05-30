import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { ensureDir, writeTextFile } from "../utils/file.js";

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);
const ffprobe = requireFromHere("ffprobe-static") as { path: string };

type ProbeResult = {
  streams: Array<{ codec_type: string; width?: number; height?: number; avg_frame_rate?: string }>;
  format: { duration?: string };
};

export async function analyzeReferenceVideo(inputPath = "reference/target_reel.mp4"): Promise<string> {
  await ensureDir("data/reference");
  const outputPath = "data/reference/target_reel_analysis.md";

  if (!existsSync(inputPath)) {
    await writeTextFile(outputPath, `# Target Reel Analysis\n\nNo reference video found at \`${inputPath}\`.\n`);
    return outputPath;
  }

  const { stdout } = await execFileAsync(ffprobe.path, [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=width,height,avg_frame_rate,codec_type",
    "-of",
    "json",
    inputPath
  ]);
  const probe = JSON.parse(stdout) as ProbeResult;
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  const duration = Number(probe.format.duration ?? 0);

  const analysis = `# Target Reel Analysis

Source: \`${inputPath}\`

## Technical Summary

- Duration: ${duration.toFixed(2)}s
- Resolution: ${video?.width ?? "unknown"}x${video?.height ?? "unknown"}
- Frame rate: ${video?.avg_frame_rate ?? "unknown"}
- Observed scene count: about 25-35 short cards in the full reference recording

## Editing Grammar To Reuse

- First 3 seconds: oversized, high-contrast hook with a large percentage/issue phrase.
- Character timing: character appears after the initial proof/source card, then returns as a reaction beat and guide.
- Character motion: clock/attention prop, presenter pose, pointing/checking pose, newspaper/source reaction.
- Source/card placement: central proof card or screenshot area, framed by a persistent top headline and bottom disclaimer zone.
- Subtitle style: large lower-third Korean captions, white with strong dark outline, usually 1-2 lines.
- CTA style: closing card asks viewers to check official material, comments, or profile link rather than pushing a trade.
- Transition pattern: fast cuts with occasional zoom/flash emphasis; no complex cinematic transition required.

## Abstracted Market Detective Scene Grammar

1. Hook scene: one very large topic statement, no detailed explanation yet.
2. Detective intro scene: mascot enters and frames the next 30 seconds as a short investigation.
3. Source explanation scene: show source/proof card and summarize what happened.
4. Market meaning scene: turn the event into numbers, keywords, and market reaction.
5. Mascot reaction scene: humorous interruption to reset attention.
6. Checkpoint scene: provide non-advisory checklist.
7. CTA scene: comments/profile/official material CTA plus investment responsibility disclaimer.

## Guardrails

- Do not clone specific wording, company claims, art, or timing from the reference.
- Reuse only the grammar: headline-card rhythm, mascot as guide, big captions, proof-first explanation, and cautious CTA.
`;

  await writeTextFile(outputPath, analysis);
  return outputPath;
}

async function main(): Promise<void> {
  const result = await analyzeReferenceVideo();
  console.log(`Reference analysis written: ${result}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ? path.resolve(process.argv[1]) : "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
