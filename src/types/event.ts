export type ChannelId = "market-detective";
export type Market = "KR" | "US";
export type MarketEventType =
  | "news"
  | "disclosure"
  | "earnings"
  | "price_move"
  | "sector_theme";

export type RawMarketEvent = {
  sourceName: string;
  sourceUrl?: string;
  market: Market;
  ticker: string;
  assetName: string;
  headline: string;
  body: string;
  priceChangePercent: number;
  volumeChangePercent: number;
  eventType: MarketEventType;
  collectedAt: string;
};

export type NormalizedMarketEvent = {
  id: string;
  channelId: ChannelId;
  sourceName: string;
  sourceUrl: string;
  market: Market;
  ticker: string;
  assetName: string;
  headline: string;
  summary: string;
  eventType: MarketEventType;
  priceChangePercent: number;
  volumeChangePercent: number;
  importanceScore: number;
  collectedAt: string;
  createdAt: string;
};
