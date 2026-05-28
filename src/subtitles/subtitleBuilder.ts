import type { SubtitleLine } from "../types/reel.js";

function splitLongText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let index = 0; index < word.length; index += maxChars) {
        chunks.push(word.slice(index, index + maxChars));
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function buildSubtitles(
  narrationScript: string,
  totalDurationSec = 30
): SubtitleLine[] {
  const normalized = narrationScript.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const roughSegments = normalized
    .split(/(?<=[.!?。！？,，])\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = roughSegments.flatMap((segment) => splitLongText(segment, 28));
  const durationPerLine = Math.min(3, Math.max(1.5, totalDurationSec / chunks.length));
  let cursor = 0;

  return chunks.map((chunk, index) => {
    const startSec = Number(cursor.toFixed(2));
    const endSec =
      index === chunks.length - 1
        ? Math.min(totalDurationSec, Number((cursor + durationPerLine).toFixed(2)))
        : Number((cursor + durationPerLine).toFixed(2));
    cursor = endSec;
    return {
      startSec,
      endSec,
      text: chunk
    };
  });
}
