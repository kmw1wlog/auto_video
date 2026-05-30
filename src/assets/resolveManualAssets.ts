import { existsSync } from "node:fs";
import path from "node:path";
import type { AssetSource, SceneKind } from "../storyboard/types.js";

export type ResolvedSceneAsset = {
  assetPath?: string;
  source: AssetSource;
  note?: string;
};

const MANUAL_ASSET_BY_SCENE: Partial<Record<SceneKind, string>> = {
  shock_hook: "hero.png",
  what_happened: "source_1.png",
  why_it_matters: "chart.png"
};

export function resolveManualAsset(runId: string, sceneKind: SceneKind): ResolvedSceneAsset {
  const fileName = MANUAL_ASSET_BY_SCENE[sceneKind];
  if (!fileName) {
    return {
      source: "generated",
      note: "No manual asset slot for this scene."
    };
  }

  const assetPath = path.join("data/manual-assets", runId, fileName);
  if (!existsSync(assetPath)) {
    return {
      source: "generated",
      note: `${fileName} not found; generated card will be used.`
    };
  }

  return {
    assetPath,
    source: "manual",
    note: `${fileName} supplied in manual asset folder.`
  };
}
