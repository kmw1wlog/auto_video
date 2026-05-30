import type { SubtitleLine } from "../types/reel.js";

export type RenderMode = "full_auto" | "semi_manual";

export type SceneKind =
  | "shock_hook"
  | "detective_intro"
  | "what_happened"
  | "why_it_matters"
  | "detective_reaction"
  | "checkpoint"
  | "cta";

export type AssetSource = "manual" | "generated" | "fallback";

export type MascotAction =
  | "idle_breath"
  | "clock_intro"
  | "magnifier_pop"
  | "shock_jump"
  | "funny_reaction"
  | "warning_sign"
  | "point_chart"
  | "cta_point_down"
  | "document_found";

export type StoryboardMarketEvent = {
  id: string;
  ticker?: string;
  companyName?: string;
  market: "KR" | "US" | "UNKNOWN";
  eventType: "disclosure" | "price_move" | "news" | "earnings" | "theme" | "manual";
  headline: string;
  summary: string;
  sourceUrls: string[];
  numbers: Array<{
    label: string;
    value: string;
    note?: string;
  }>;
  keywords: string[];
  riskNotes: string[];
  collectedAt: string;
  importanceScore: number;
};

export interface StoryboardScene {
  id: string;
  kind: SceneKind;
  startSec: number;
  endSec: number;
  headline: string;
  bodyLines: string[];
  subtitle: string;
  visualSlot: "hero" | "source" | "numbers" | "reaction" | "checklist" | "cta";
  assetPath?: string;
  assetSource: AssetSource;
  mascotAction: MascotAction;
  mascotClipPath?: string;
  transition: "cut" | "zoom" | "flash" | "swipe";
}

export interface ReelStoryboard {
  runId: string;
  channel: "market_detective";
  mode: RenderMode;
  title: string;
  hookCandidates: string[];
  scenes: StoryboardScene[];
  narrationScript: string;
  subtitles: SubtitleLine[];
  instagramCaption: string;
  disclaimer: string;
  sourceUrls: string[];
  assetLog: Array<{
    sceneId: string;
    assetPath: string;
    source: AssetSource;
    note?: string;
  }>;
  moderation: {
    passed: boolean;
    warnings: string[];
    blockedTerms: string[];
  };
  providerUsage: {
    openAi: boolean;
    openDart: boolean;
    kis: boolean;
    search: "perplexity" | "brave" | "none";
    tts: "fal-elevenlabs" | "openai" | "local-audio-placeholder" | "silent";
  };
}

export const DEFAULT_SCENE_TIMINGS: Array<Pick<StoryboardScene, "kind" | "startSec" | "endSec" | "visualSlot" | "mascotAction" | "transition">> = [
  {
    kind: "shock_hook",
    startSec: 0,
    endSec: 2.8,
    visualSlot: "hero",
    mascotAction: "shock_jump",
    transition: "flash"
  },
  {
    kind: "detective_intro",
    startSec: 2.8,
    endSec: 5.5,
    visualSlot: "reaction",
    mascotAction: "clock_intro",
    transition: "cut"
  },
  {
    kind: "what_happened",
    startSec: 5.5,
    endSec: 10.5,
    visualSlot: "source",
    mascotAction: "document_found",
    transition: "swipe"
  },
  {
    kind: "why_it_matters",
    startSec: 10.5,
    endSec: 17,
    visualSlot: "numbers",
    mascotAction: "point_chart",
    transition: "zoom"
  },
  {
    kind: "detective_reaction",
    startSec: 17,
    endSec: 21,
    visualSlot: "reaction",
    mascotAction: "funny_reaction",
    transition: "flash"
  },
  {
    kind: "checkpoint",
    startSec: 21,
    endSec: 27,
    visualSlot: "checklist",
    mascotAction: "warning_sign",
    transition: "cut"
  },
  {
    kind: "cta",
    startSec: 27,
    endSec: 30,
    visualSlot: "cta",
    mascotAction: "cta_point_down",
    transition: "zoom"
  }
];
