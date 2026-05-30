import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";
import type { SceneKind, StoryboardScene } from "../storyboard/types.js";
import { ensureDir } from "../utils/file.js";

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);
const ffmpegPath = requireFromHere("ffmpeg-static") as string | null;

const CARD_COLOR_BY_KIND: Record<SceneKind, string> = {
  shock_hook: "0xFFF2A8",
  detective_intro: "0xB9E8C9",
  what_happened: "0xFFFFFF",
  why_it_matters: "0xE7F2FF",
  detective_reaction: "0xEFE0FF",
  checkpoint: "0xFFE8B8",
  cta: "0xF7FFBF"
};

export async function generateFallbackCard(runDir: string, scene: StoryboardScene): Promise<string> {
  if (!ffmpegPath) {
    throw new Error("FFmpeg 실행 실패: fallback card 생성을 위한 ffmpeg-static binary path를 찾을 수 없습니다.");
  }

  const cardDir = path.join(runDir, "cards");
  await ensureDir(cardDir);
  const cardPath = path.join(cardDir, `${scene.id}.png`);
  const color = CARD_COLOR_BY_KIND[scene.kind];

  await execFileAsync(ffmpegPath, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=900x760`,
    "-vf",
    "drawbox=x=0:y=0:w=900:h=760:color=0x111111@0.08:t=12,drawbox=x=36:y=36:w=828:h=688:color=white@0.25:t=4",
    "-frames:v",
    "1",
    "-update",
    "1",
    cardPath
  ]);

  return cardPath;
}
