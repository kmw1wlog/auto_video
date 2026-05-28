import type { ChannelId, NormalizedMarketEvent } from "./event.js";

export type ReelScene = {
  index: number;
  startSec: number;
  endSec: number;
  visualType: "hook" | "event_summary" | "key_numbers" | "risk_note" | "cta";
  onScreenText: string;
};

export type SubtitleLine = {
  startSec: number;
  endSec: number;
  text: string;
};

export type ReelPlan = {
  id: string;
  channelId: ChannelId;
  eventId: string;
  title: string;
  hook: string;
  narrationScript: string;
  scenes: ReelScene[];
  subtitles: SubtitleLine[];
  instagramCaption: string;
  disclaimer: string;
  cta: string;
  createdAt: string;
};

export type ReviewPackage = {
  channelId: ChannelId;
  title: string;
  event: NormalizedMarketEvent;
  script: ReelPlan;
  videoPath: string;
  thumbnailPath: string;
  sourceUrl: string;
  moderationStatus: "passed";
  readyForApproval: true;
};
