import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);
const ffmpegPath = requireFromHere("ffmpeg-static") as string | null;

async function canDecodePng(filePath: string): Promise<boolean> {
  if (!ffmpegPath || !existsSync(filePath)) return false;
  try {
    await execFileAsync(ffmpegPath, ["-v", "error", "-i", filePath, "-frames:v", "1", "-f", "null", "-"]);
    return true;
  } catch {
    return false;
  }
}

export async function ensureFallbackMascotPng(filePath: string): Promise<string> {
  if (await canDecodePng(filePath)) {
    return filePath;
  }
  if (!ffmpegPath) {
    throw new Error("FFmpeg 실행 실패: fallback mascot PNG 생성을 위한 ffmpeg-static binary path를 찾을 수 없습니다.");
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await execFileAsync(ffmpegPath, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0xEAF3FF:s=512x512",
    "-vf",
    [
      "drawbox=x=0:y=0:w=512:h=512:color=0x2463C7@1:t=24",
      "drawbox=x=72:y=96:w=368:h=288:color=white@0.86:t=fill",
      "drawbox=x=72:y=96:w=368:h=288:color=0x102A4C@1:t=10",
      "drawbox=x=150:y=165:w=212:h=92:color=0xD6B464@1:t=fill",
      "drawbox=x=180:y=285:w=152:h=34:color=0x102A4C@1:t=fill"
    ].join(","),
    "-frames:v",
    "1",
    "-update",
    "1",
    filePath
  ]);
  return filePath;
}

export async function resolveMascotPath(primaryPath: string, fallbackPath: string): Promise<string> {
  if (existsSync(primaryPath)) {
    return primaryPath;
  }

  return ensureFallbackMascotPng(fallbackPath);
}
