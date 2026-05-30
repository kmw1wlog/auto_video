import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";
import { ensureDir } from "../utils/file.js";

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);
const ffmpegPath = requireFromHere("ffmpeg-static") as string | null;

export async function createMockTtsAudio(
  outputDir: string,
  durationSec = 30,
  options: { audible?: boolean } = {}
): Promise<string> {
  if (!ffmpegPath) {
    throw new Error("FFmpeg 실행 실패: ffmpeg-static binary path를 찾을 수 없습니다. npm install을 다시 실행하세요.");
  }

  await ensureDir(outputDir);
  const audioPath = path.join(outputDir, "voice.wav");

  try {
    const inputFilter = options.audible
      ? "sine=frequency=220:sample_rate=44100"
      : "anullsrc=channel_layout=stereo:sample_rate=44100";
    const audioFilter = options.audible
      ? [
          "-af",
          `volume=0.08,afade=t=in:st=0:d=0.35,afade=t=out:st=${Math.max(durationSec - 1, 0)}:d=1`
        ]
      : [];

    await execFileAsync(ffmpegPath, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      inputFilter,
      "-t",
      String(durationSec),
      ...audioFilter,
      "-c:a",
      "pcm_s16le",
      audioPath
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`FFmpeg 실행 실패: mock TTS wav 생성 중 오류가 발생했습니다. ${message}`);
  }

  if (!existsSync(audioPath) || statSync(audioPath).size === 0) {
    throw new Error("mock TTS 생성 실패: 오디오 파일이 생성되지 않았거나 비어 있습니다.");
  }

  return audioPath;
}
