import { existsSync, statSync } from "node:fs";
import type { MascotAction } from "../storyboard/types.js";

export type ResolvedMascot = {
  action: MascotAction;
  path: string;
  source: "clip" | "fallback";
  note: string;
};

const CLIP_BY_ACTION: Record<MascotAction, string> = {
  idle_breath: "00_idle_breath.mp4",
  clock_intro: "01_clock_intro.mp4",
  magnifier_pop: "02_magnifier_pop.mp4",
  shock_jump: "03_shock_jump.mp4",
  funny_reaction: "04_funny_reaction.mp4",
  warning_sign: "05_warning_sign.mp4",
  point_chart: "06_point_chart.mp4",
  cta_point_down: "07_cta_point_down.mp4",
  document_found: "08_document_found.mp4"
};

export async function resolveMascotClip(action: MascotAction): Promise<ResolvedMascot> {
  const clipPath = `assets/mascot/market-detective/clips/${CLIP_BY_ACTION[action]}`;
  if (existsSync(clipPath)) {
    return {
      action,
      path: clipPath,
      source: "clip",
      note: `${CLIP_BY_ACTION[action]} found.`
    };
  }

  const fallbackPath = resolveFallbackMascotPng();
  return {
    action,
    path: fallbackPath,
    source: "fallback",
    note: `${CLIP_BY_ACTION[action]} missing; fallback PNG used.`
  };
}

function resolveFallbackMascotPng(): string {
  const userMascotPath = "assets/mascot/market-detective/market_detective.png";
  if (existsSync(userMascotPath) && statSync(userMascotPath).size > 10_000) {
    return userMascotPath;
  }

  const mvpMascotPath = "assets/mascot/market-detective.png";
  if (existsSync(mvpMascotPath)) {
    return mvpMascotPath;
  }

  return "tests/fixtures/mascot-placeholder.png";
}
