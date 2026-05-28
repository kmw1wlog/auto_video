import type { ReelPlan, SubtitleLine } from "../types/reel.js";
import { FORBIDDEN_WORDS } from "./forbiddenWords.js";

export type ModerationResult =
  | { moderationStatus: "passed"; forbiddenWords: [] }
  | { moderationStatus: "failed"; forbiddenWords: string[] };

type ScriptLike = Pick<ReelPlan, "narrationScript" | "instagramCaption"> & {
  subtitles: SubtitleLine[];
};

export function validateScript(script: ScriptLike): ModerationResult {
  const haystack = [
    script.narrationScript,
    script.instagramCaption,
    ...script.subtitles.map((subtitle) => subtitle.text)
  ].join("\n");
  const found = FORBIDDEN_WORDS.filter((word) => haystack.includes(word));

  if (found.length > 0) {
    return {
      moderationStatus: "failed",
      forbiddenWords: found
    };
  }

  return {
    moderationStatus: "passed",
    forbiddenWords: []
  };
}
