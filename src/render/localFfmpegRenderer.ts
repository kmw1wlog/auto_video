import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";
import type { RenderInput, RenderResult } from "../types/render.js";
import { ensureDir, writeTextFile } from "../utils/file.js";
import type { RenderAdapter } from "./renderAdapter.js";

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);
const ffmpegPath = requireFromHere("ffmpeg-static") as string | null;
const ffprobe = requireFromHere("ffprobe-static") as { path: string };

function getFfmpegPath(): string {
  if (!ffmpegPath) {
    throw new Error("FFmpeg 실행 실패: ffmpeg-static binary path를 찾을 수 없습니다. npm install을 다시 실행하세요.");
  }
  return ffmpegPath;
}

function getFfprobePath(): string {
  if (!ffprobe.path) {
    throw new Error("FFprobe 실행 실패: ffprobe-static binary path를 찾을 수 없습니다. npm install을 다시 실행하세요.");
  }
  return ffprobe.path;
}

function escapeFilterPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/'/g, "\\'");
}

function formatAssTime(seconds: number): string {
  const cs = Math.round(seconds * 100);
  const hours = Math.floor(cs / 360000);
  const minutes = Math.floor((cs % 360000) / 6000);
  const secs = Math.floor((cs % 6000) / 100);
  const centis = cs % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function escapeAssText(text: string): string {
  return text.replace(/[{}]/g, "").replace(/\n/g, "\\N");
}

function assDialogue(start: number, end: number, style: string, text: string): string {
  return `Dialogue: 0,${formatAssTime(start)},${formatAssTime(end)},${style},,0,0,0,,${escapeAssText(text)}`;
}

function buildFullAss(input: RenderInput): string {
  const sceneEvents = input.scenes
    .map((scene) => assDialogue(scene.startSec, scene.endSec, scene.visualType === "key_numbers" ? "Metric" : "Scene", scene.onScreenText))
    .join("\n");
  const subtitles = input.subtitles
    .map((line) => assDialogue(line.startSec, line.endSec, "Subtitle", line.text))
    .join("\n");

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Channel,Arial,62,&H00111111,&H000000FF,&H00FFD43B,&H00000000,1,0,0,0,100,100,0,0,1,0,0,8,60,60,48,1
Style: Title,Arial,70,&H00FFFFFF,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,5,1,8,80,80,220,1
Style: Hook,Arial,72,&H003BD4FF,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,5,1,5,90,90,0,1
Style: Scene,Arial,68,&H00FFFFFF,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,5,1,5,90,90,0,1
Style: Metric,Arial,76,&H0058A018,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,5,1,5,90,90,0,1
Style: CTA,Arial,58,&H003BD4FF,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,4,1,2,80,80,500,1
Style: Disclaimer,Arial,34,&H00FFFFFF,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,3,1,2,80,80,70,1
Style: Subtitle,Arial,74,&H00FFFFFF,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,5,1,2,80,80,240,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${assDialogue(0, 30, "Channel", "시장탐정")}
${assDialogue(0, 30, "Title", input.title)}
${assDialogue(0, 3, "Hook", input.hook)}
${sceneEvents}
${assDialogue(25, 30, "CTA", input.cta)}
${assDialogue(0, 30, "Disclaimer", input.disclaimer)}
${subtitles}
`;
}

async function probeVideo(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  const { stdout } = await execFileAsync(getFfprobePath(), [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    videoPath
  ]);
  const parsed = JSON.parse(stdout) as {
    streams: Array<{ width: number; height: number }>;
    format: { duration: string };
  };
  return {
    width: parsed.streams[0]?.width ?? 0,
    height: parsed.streams[0]?.height ?? 0,
    duration: Number(parsed.format.duration)
  };
}

export class LocalFfmpegRenderer implements RenderAdapter {
  async render(input: RenderInput): Promise<RenderResult> {
    const ffmpeg = getFfmpegPath();
    const outputDir = path.dirname(input.outputPath);
    await ensureDir(outputDir);

    const assPath = path.join(outputDir, "subtitles.ass");
    const thumbnailPath = path.join(outputDir, "thumbnail.png");
    await writeTextFile(assPath, buildFullAss(input));

    const videoFilters = [
      "format=yuv420p",
      "drawbox=x=0:y=0:w=1080:h=1920:color=0x111111@1:t=fill",
      "drawbox=x=0:y=0:w=1080:h=170:color=0xFFD43B@0.95:t=fill",
      "drawbox=x=0:y=170:w=1080:h=10:color=0x18A058@1:t=fill",
      "drawbox=x=70:y=250:w=940:h=1420:color=black@0.32:t=fill"
    ].join(",");

    const filterComplex = [
      `[0:v]${videoFilters}[base]`,
      "[1:v]format=rgba,scale=w='if(gte(t,27),330,260)':h=-1:eval=frame[mascot]",
      `[base][mascot]overlay=x='W-w-54':y='H-h-390+24*sin(2*PI*t/1.4)':format=auto[withMascot]`,
      `[withMascot]ass='${escapeFilterPath(assPath)}'[vout]`
    ].join(";");

    try {
      await execFileAsync(
        ffmpeg,
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          "color=c=#111111:s=1080x1920:d=30:r=30",
          "-loop",
          "1",
          "-i",
          input.mascotPath,
          "-i",
          input.audioPath,
          "-filter_complex",
          filterComplex,
          "-map",
          "[vout]",
          "-map",
          "2:a",
          "-t",
          "30",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "30",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-shortest",
          input.outputPath
        ],
        { maxBuffer: 1024 * 1024 * 20 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`FFmpeg 실행 실패: 9:16 MP4 렌더링 중 오류가 발생했습니다. ${message}`);
    }

    if (!existsSync(input.outputPath) || statSync(input.outputPath).size === 0) {
      throw new Error("FFmpeg 렌더링 실패: output video 파일이 생성되지 않았거나 비어 있습니다.");
    }

    await execFileAsync(ffmpeg, [
      "-y",
      "-ss",
      "1",
      "-i",
      input.outputPath,
      "-frames:v",
      "1",
      thumbnailPath
    ]);

    const probed = await probeVideo(input.outputPath);
    if (probed.width !== 1080 || probed.height !== 1920) {
      throw new Error(`FFmpeg 검증 실패: 예상 해상도 1080x1920, 실제 ${probed.width}x${probed.height}`);
    }
    if (probed.duration < 29 || probed.duration > 31) {
      throw new Error(`FFmpeg 검증 실패: 예상 길이 30초, 실제 ${probed.duration.toFixed(2)}초`);
    }

    return {
      videoPath: input.outputPath,
      thumbnailPath,
      durationSec: probed.duration,
      width: 1080,
      height: 1920,
      status: "done"
    };
  }
}
