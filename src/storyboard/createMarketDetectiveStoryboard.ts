import path from "node:path";
import type { RenderMode, ReelStoryboard, StoryboardMarketEvent } from "./types.js";
import { validateStoryboard } from "./validateStoryboard.js";
import { resolveManualAsset } from "../assets/resolveManualAssets.js";
import { generateFallbackCard } from "../assets/generateFallbackCards.js";
import { resolveMascotClip } from "../assets/resolveMascotClip.js";
import { createMockStoryboard } from "../planner/mockStoryboardPlanner.js";
import { createOpenAiStoryboard } from "../planner/openAiStoryboardPlanner.js";

export async function createMarketDetectiveStoryboard(input: {
  runDir: string;
  runId: string;
  event: StoryboardMarketEvent;
  mode: RenderMode;
  useOpenAiPlanner: boolean;
  providerUsage?: Partial<ReelStoryboard["providerUsage"]>;
}): Promise<ReelStoryboard> {
  const base = input.useOpenAiPlanner
    ? await createOpenAiStoryboard({ runId: input.runId, event: input.event, mode: input.mode })
    : createMockStoryboard({
        runId: input.runId,
        event: input.event,
        mode: input.mode,
        providerUsage: input.providerUsage
      });

  const assetLog: ReelStoryboard["assetLog"] = [];
  const scenes = [];
  for (const scene of base.scenes) {
    const manual = input.mode === "semi_manual" ? resolveManualAsset(input.runId, scene.kind) : { source: "generated" as const };
    const assetPath = manual.assetPath ?? await generateFallbackCard(input.runDir, scene);
    const mascot = await resolveMascotClip(scene.mascotAction);
    const assetSource = manual.assetPath ? manual.source : "generated";

    assetLog.push({
      sceneId: scene.id,
      assetPath,
      source: assetSource,
      note: manual.note
    });
    assetLog.push({
      sceneId: scene.id,
      assetPath: mascot.path,
      source: mascot.source === "clip" ? "manual" : "fallback",
      note: mascot.note
    });

    scenes.push({
      ...scene,
      assetPath: path.normalize(assetPath),
      assetSource,
      mascotClipPath: path.normalize(mascot.path)
    });
  }

  const storyboard: ReelStoryboard = {
    ...base,
    runId: input.runId,
    mode: input.mode,
    scenes,
    assetLog,
    providerUsage: {
      ...base.providerUsage,
      ...input.providerUsage
    }
  };

  const errors = validateStoryboard(storyboard);
  if (errors.length > 0) {
    throw new Error(`Storyboard validation failed: ${errors.join(" ")}`);
  }

  return storyboard;
}
