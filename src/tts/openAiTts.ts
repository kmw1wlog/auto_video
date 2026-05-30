import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { createFalElevenLabsAudio } from "./falElevenLabsTts.js";
import { createMockTtsAudio } from "./mockTts.js";
import { ensureDir } from "../utils/file.js";

export type TtsResult = {
  audioPath: string;
  mode: "fal-elevenlabs" | "openai" | "local-audio-placeholder" | "silent";
  error?: string;
};

function boolEnv(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

async function fallbackAudio(outputDir: string, durationSec: number, error?: string): Promise<TtsResult> {
  const audible = boolEnv(process.env.USE_AUDIBLE_MOCK_TTS);
  return {
    audioPath: await createMockTtsAudio(outputDir, durationSec, { audible }),
    mode: audible ? "local-audio-placeholder" : "silent",
    error
  };
}

export async function createNarrationAudio(input: {
  outputDir: string;
  narrationScript: string;
  durationSec?: number;
  useOpenAiTts: boolean;
}): Promise<TtsResult> {
  await ensureDir(input.outputDir);
  const durationSec = input.durationSec ?? 30;

  if (boolEnv(process.env.USE_FAL_ELEVENLABS_TTS) && (process.env.FAL_KEY || process.env.FAL_API_KEY)) {
    try {
      return {
        audioPath: await createFalElevenLabsAudio({
          outputDir: input.outputDir,
          narrationScript: input.narrationScript
        }),
        mode: "fal-elevenlabs"
      };
    } catch (error) {
      const falError = error instanceof Error ? error.message : String(error);
      if (!input.useOpenAiTts || !process.env.OPENAI_API_KEY) {
        return fallbackAudio(input.outputDir, durationSec, falError);
      }
    }
  }

  if (!input.useOpenAiTts || !process.env.OPENAI_API_KEY) {
    return fallbackAudio(input.outputDir, durationSec);
  }

  const audioPath = path.join(input.outputDir, "voice.mp3");
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE ?? "alloy",
        input: input.narrationScript
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI TTS HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await import("node:fs/promises").then(({ writeFile }) => writeFile(audioPath, buffer));
    if (!existsSync(audioPath) || statSync(audioPath).size === 0) {
      throw new Error("OpenAI TTS returned an empty file.");
    }
    return {
      audioPath,
      mode: "openai"
    };
  } catch (error) {
    return fallbackAudio(input.outputDir, durationSec, error instanceof Error ? error.message : String(error));
  }
}
