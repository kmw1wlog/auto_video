import type { ReelStoryboard } from "./types.js";

export function validateStoryboard(storyboard: ReelStoryboard): string[] {
  const errors: string[] = [];

  if (storyboard.scenes.length !== 7) {
    errors.push(`Storyboard must contain exactly 7 scenes, got ${storyboard.scenes.length}.`);
  }

  if (!storyboard.narrationScript.trim()) {
    errors.push("Storyboard narrationScript is empty.");
  }

  for (const [index, scene] of storyboard.scenes.entries()) {
    if (scene.endSec <= scene.startSec) {
      errors.push(`${scene.id} has invalid duration.`);
    }
    const previous = storyboard.scenes[index - 1];
    if (previous && scene.startSec < previous.endSec) {
      errors.push(`${scene.id} overlaps with ${previous.id}.`);
    }
    if (!scene.headline.trim() || !scene.subtitle.trim()) {
      errors.push(`${scene.id} is missing headline or subtitle.`);
    }
  }

  return errors;
}
