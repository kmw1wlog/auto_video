import type { ChannelId } from "../types/event.js";

export type PublishInput = {
  videoPath: string;
  caption: string;
  channelId: ChannelId;
};

export type PublishResult = {
  platform: "instagram";
  mode: "dry-run";
  wouldPublish: true;
  mediaType: "REELS";
  videoPath: string;
  caption: string;
  createdAt: string;
};

export interface PublishAdapter {
  publish(input: PublishInput, outputPath?: string): Promise<PublishResult>;
}
