import type { ChannelId } from "./event.js";
import type { ReelScene, SubtitleLine } from "./reel.js";

export type RenderInput = {
  channelId: ChannelId;
  title: string;
  hook: string;
  scenes: ReelScene[];
  subtitles: SubtitleLine[];
  mascotPath: string;
  audioPath: string;
  outputPath: string;
  disclaimer: string;
  cta: string;
};

export type RenderResult = {
  videoPath: string;
  thumbnailPath: string;
  durationSec: number;
  width: 1080;
  height: 1920;
  status: "done";
};
