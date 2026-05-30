import { existsSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

type FalQueueResponse = {
  request_id?: string;
  response_url?: string;
  status_url?: string;
  status?: string;
  error?: string;
  audio?: { url?: string };
  audio_url?: string;
};

function getFalKey(): string | undefined {
  return process.env.FAL_KEY || process.env.FAL_API_KEY;
}

function getAudioUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.audio_url === "string") return record.audio_url;
  if (typeof record.url === "string") return record.url;
  if (record.audio && typeof record.audio === "object") {
    const audio = record.audio as Record<string, unknown>;
    if (typeof audio.url === "string") return audio.url;
  }
  return undefined;
}

async function fetchJson(url: string, key: string): Promise<FalQueueResponse> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Key ${key}`
    }
  });
  if (!response.ok) {
    throw new Error(`Fal queue HTTP ${response.status}`);
  }
  return response.json() as Promise<FalQueueResponse>;
}

async function waitForFalResult(submitResult: FalQueueResponse, key: string): Promise<FalQueueResponse> {
  if (getAudioUrl(submitResult)) return submitResult;
  if (!submitResult.status_url || !submitResult.response_url) {
    throw new Error("Fal queue response did not include status_url/response_url.");
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 90_000) {
    const status = await fetchJson(`${submitResult.status_url}?logs=1`, key);
    if (status.error) {
      throw new Error(status.error);
    }
    if (status.status === "COMPLETED") {
      return fetchJson(submitResult.response_url, key);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("Fal queue timed out before TTS completed.");
}

export async function createFalElevenLabsAudio(input: {
  outputDir: string;
  narrationScript: string;
  voiceId?: string;
  voiceName?: string;
}): Promise<string> {
  const key = getFalKey();
  if (!key) {
    throw new Error("FAL_KEY 또는 FAL_API_KEY가 설정되지 않았습니다.");
  }

  const endpoint = process.env.FAL_ELEVENLABS_TTS_ENDPOINT ?? "https://queue.fal.run/fal-ai/elevenlabs/tts/eleven-v3";
  const payload = {
    text: input.narrationScript,
    voice: input.voiceName || process.env.FAL_ELEVENLABS_VOICE || "Rachel",
    voice_id: input.voiceId || process.env.FAL_ELEVENLABS_VOICE_ID || undefined,
    stability: Number(process.env.FAL_ELEVENLABS_STABILITY ?? 0.5),
    language_code: process.env.FAL_ELEVENLABS_LANGUAGE_CODE ?? "ko",
    apply_text_normalization: "auto"
  };

  const submitResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
      "X-Fal-No-Retry": "1"
    },
    body: JSON.stringify(payload)
  });
  if (!submitResponse.ok) {
    throw new Error(`Fal ElevenLabs TTS HTTP ${submitResponse.status}`);
  }

  const result = await waitForFalResult(await submitResponse.json() as FalQueueResponse, key);
  const audioUrl = getAudioUrl(result);
  if (!audioUrl) {
    throw new Error("Fal ElevenLabs TTS 결과에서 audio URL을 찾지 못했습니다.");
  }

  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Fal ElevenLabs audio download HTTP ${audioResponse.status}`);
  }

  const audioPath = path.join(input.outputDir, "voice.mp3");
  await writeFile(audioPath, Buffer.from(await audioResponse.arrayBuffer()));
  if (!existsSync(audioPath) || statSync(audioPath).size === 0) {
    throw new Error("Fal ElevenLabs TTS returned an empty file.");
  }
  return audioPath;
}
