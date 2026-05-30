import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";
import type { ReelStoryboard } from "../storyboard/types.js";
import { createAssSubtitles } from "../subtitles/createAssSubtitles.js";
import { ensureDir, writeJsonFile, writeTextFile } from "../utils/file.js";

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);
const ffmpegPath = requireFromHere("ffmpeg-static") as string | null;
const ffprobe = requireFromHere("ffprobe-static") as { path: string };

export type StoryboardRenderResult = {
  videoPath: string;
  thumbnailPath: string;
  storyboardPath: string;
  subtitlesPath: string;
  assetLogPath: string;
  durationSec: number;
  width: 1080;
  height: 1920;
  status: "done";
};

function getFfmpegPath(): string {
  if (!ffmpegPath) {
    throw new Error("FFmpeg 실행 실패: ffmpeg-static binary path를 찾을 수 없습니다.");
  }
  return ffmpegPath;
}

function escapeFilterPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/'/g, "\\'");
}

function formatFilterSeconds(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function betweenExpression(startSec: number, endSec: number): string {
  return `between(t\\,${formatFilterSeconds(startSec)}\\,${formatFilterSeconds(endSec)})`;
}

function isVideoAsset(value: string): boolean {
  return [".mp4", ".mov", ".webm", ".m4v"].includes(path.extname(value).toLowerCase());
}

function mediaInputArgs(mediaPath: string): string[] {
  if (isVideoAsset(mediaPath)) {
    return ["-stream_loop", "-1", "-t", "30", "-i", mediaPath];
  }
  return ["-loop", "1", "-t", "30", "-i", mediaPath];
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

function dialogue(start: number, end: number, style: string, text: string): string {
  return `Dialogue: 0,${formatAssTime(start)},${formatAssTime(end)},${style},,0,0,0,,${escapeAssText(text)}`;
}

function storyboardAss(storyboard: ReelStoryboard): string {
  const sceneLines = storyboard.scenes
    .flatMap((scene) => {
      const body = scene.bodyLines.slice(0, 3).join("\\N");
      return [
        dialogue(scene.startSec, scene.endSec, "Headline", scene.headline),
        dialogue(scene.startSec, scene.endSec, "Body", body),
        dialogue(scene.startSec, scene.endSec, "Subtitle", scene.subtitle)
      ];
    })
    .join("\n");

  const hookCandidates =
    storyboard.hookCandidates.length > 1 ? `후보: ${storyboard.hookCandidates.slice(1).join(" / ")}` : "";

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 540
PlayResY: 960

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Brand,Arial,25,&H00111111,&H000000FF,&H00FFD43B,&H00000000,1,0,0,0,100,100,0,0,1,0,0,8,30,30,24,1
Style: Title,Arial,24,&H00111111,&H000000FF,&H00FFFFFF,&H00000000,1,0,0,0,100,100,0,0,1,1,1,8,35,35,66,1
Style: Headline,Arial,40,&H00111111,&H000000FF,&H00FFFFFF,&H00000000,1,0,0,0,100,100,0,0,1,2,1,8,35,35,118,1
Style: Body,Arial,28,&H00111111,&H000000FF,&H00FFFFFF,&HDDFFFFFF,1,0,0,0,100,100,0,0,1,2,1,5,58,58,0,1
Style: Subtitle,Arial,37,&H00FFFFFF,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,3,1,2,40,40,115,1
Style: CTA,Arial,27,&H00111111,&H000000FF,&H00FFFFFF,&H00000000,1,0,0,0,100,100,0,0,1,2,1,2,40,40,245,1
Style: Disclaimer,Arial,15,&H00111111,&H000000FF,&H00FFFFFF,&H00000000,1,0,0,0,100,100,0,0,1,1,1,2,35,35,30,1
Style: Tiny,Arial,14,&H00444444,&H000000FF,&H00FFFFFF,&H00000000,0,0,0,0,100,100,0,0,1,1,0,8,35,35,98,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogue(0, 30, "Brand", "시장탐정")}
${dialogue(0, 30, "Title", storyboard.title)}
${hookCandidates ? dialogue(2.8, 5.5, "Tiny", hookCandidates) : ""}
${sceneLines}
${dialogue(27, 30, "CTA", "자료는 댓글/프로필 링크에서 확인")}
${dialogue(0, 30, "Disclaimer", storyboard.disclaimer)}
`;
}

async function probeVideo(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  const { stdout } = await execFileAsync(ffprobe.path, [
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

export class StoryboardFfmpegRenderer {
  async render(input: {
    storyboard: ReelStoryboard;
    runDir: string;
    audioPath: string;
  }): Promise<StoryboardRenderResult> {
    const ffmpeg = getFfmpegPath();
    await ensureDir(input.runDir);

    const storyboardPath = path.join(input.runDir, "storyboard.json");
    const subtitlesPath = path.join(input.runDir, "subtitles.ass");
    const assetLogPath = path.join(input.runDir, "asset-log.json");
    const timelineAssPath = path.join(input.runDir, "timeline.ass");
    const videoPath = path.join(input.runDir, "video.mp4");
    const thumbnailPath = path.join(input.runDir, "thumbnail.png");

    await writeJsonFile(storyboardPath, input.storyboard);
    await writeTextFile(subtitlesPath, createAssSubtitles(input.storyboard));
    await writeTextFile(timelineAssPath, storyboardAss(input.storyboard));
    await writeJsonFile(assetLogPath, input.storyboard.assetLog);

    const visualInputs = input.storyboard.scenes
      .map((scene, sceneIndex) => ({
        scene,
        sceneIndex,
        path: scene.assetPath
      }))
      .filter((item): item is typeof item & { path: string } => typeof item.path === "string" && existsSync(item.path));
    const mascotInputs = input.storyboard.scenes
      .map((scene, sceneIndex) => ({
        scene,
        sceneIndex,
        path: scene.mascotClipPath
      }))
      .filter((item): item is typeof item & { path: string } => typeof item.path === "string" && existsSync(item.path));
    const mascotMediaInputs = Array.from(
      mascotInputs
        .reduce((map, item) => {
          const existing = map.get(item.path);
          const window = {
            startSec: item.scene.startSec + 0.08,
            endSec: Math.min(item.scene.endSec, item.scene.startSec + 2.45)
          };
          if (existing) {
            existing.windows.push(window);
          } else {
            map.set(item.path, { path: item.path, windows: [window] });
          }
          return map;
        }, new Map<string, { path: string; windows: Array<{ startSec: number; endSec: number }> }>())
        .values()
    );

    if (mascotInputs.length === 0) {
      throw new Error("Storyboard renderer failed: mascot asset was not resolved.");
    }
    const mediaArgs = [
      ...visualInputs.flatMap((item) => mediaInputArgs(item.path)),
      ...mascotMediaInputs.flatMap((item) => mediaInputArgs(item.path))
    ];
    const audioInputIndex = 1 + visualInputs.length + mascotMediaInputs.length;

    const baseFilters = [
      "format=yuv420p",
      "drawbox=x=0:y=0:w=540:h=960:color=0xFFF2A8@1:t=fill",
      "drawbox=x=0:y=0:w=540:h=93:color=0xFFD43B@0.98:t=fill",
      "drawbox=x=0:y=93:w=540:h=5:color=0x111111@0.35:t=fill",
      "drawbox=x=32:y=170:w=476:h=425:color=white@0.72:t=fill",
      "drawbox=x=32:y=170:w=476:h=425:color=0x111111@0.16:t=4",
      "drawbox=x=35:y=630:w=470:h=105:color=0x111111@0.78:t=fill",
      "drawbox=x=0:y=925:w=540:h=35:color=0xFFD43B@0.92:t=fill"
    ].join(",");

    const filters: string[] = [`[0:v]${baseFilters}[base0]`];
    let currentLabel = "base0";

    visualInputs.forEach((item, index) => {
      const inputIndex = 1 + index;
      const assetLabel = `asset${index}`;
      const outLabel = `withAsset${index}`;
      filters.push(
        `[${inputIndex}:v]fps=30,format=rgba,scale=476:425:force_original_aspect_ratio=decrease,pad=476:425:(ow-iw)/2:(oh-ih)/2:color=white[${assetLabel}]`
      );
      filters.push(
        `[${currentLabel}][${assetLabel}]overlay=x=32:y=170:enable='${betweenExpression(item.scene.startSec, item.scene.endSec)}':format=auto:eof_action=pass[${outLabel}]`
      );
      currentLabel = outLabel;
    });

    mascotMediaInputs.forEach((item, index) => {
      const inputIndex = 1 + visualInputs.length + index;
      const mascotLabel = `mascot${index}`;
      const outLabel = `withMascot${index}`;
      const enable = item.windows.map((window) => betweenExpression(window.startSec, window.endSec)).join("+");
      filters.push(`[${inputIndex}:v]fps=30,format=rgba,scale=154:-1[${mascotLabel}]`);
      filters.push(
        `[${currentLabel}][${mascotLabel}]overlay=x='W-w-24':y='H-h-152':enable='${enable}':format=auto:eof_action=pass[${outLabel}]`
      );
      currentLabel = outLabel;
    });

    filters.push(`[${currentLabel}]ass='${escapeFilterPath(timelineAssPath)}',scale=1080:1920[vout]`);
    const filterComplex = filters.join(";");

    try {
      await execFileAsync(
        ffmpeg,
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          "color=c=#111111:s=540x960:d=30:r=30",
          ...mediaArgs,
          "-t",
          "30",
          "-i",
          input.audioPath,
          "-filter_complex",
          filterComplex,
          "-map",
          "[vout]",
          "-map",
          `${audioInputIndex}:a`,
          "-t",
          "30",
          "-frames:v",
          "900",
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
          videoPath
        ],
        { maxBuffer: 1024 * 1024 * 20 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`FFmpeg 실행 실패: storyboard 9:16 MP4 렌더링 중 오류가 발생했습니다. ${message}`);
    }

    await execFileAsync(ffmpeg, ["-y", "-ss", "1", "-i", videoPath, "-frames:v", "1", thumbnailPath]);

    if (!existsSync(videoPath) || statSync(videoPath).size === 0) {
      throw new Error("Storyboard renderer failed: video.mp4 was not created.");
    }
    const probed = await probeVideo(videoPath);
    if (probed.width !== 1080 || probed.height !== 1920 || probed.duration < 28 || probed.duration > 32) {
      throw new Error(`Storyboard renderer validation failed: ${probed.width}x${probed.height}, ${probed.duration.toFixed(2)}s`);
    }

    return {
      videoPath,
      thumbnailPath,
      storyboardPath,
      subtitlesPath,
      assetLogPath,
      durationSec: probed.duration,
      width: 1080,
      height: 1920,
      status: "done"
    };
  }
}
