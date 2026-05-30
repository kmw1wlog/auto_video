export interface SourceProvider<TInput, TOutput> {
  name: string;
  isConfigured(): boolean;
  fetch(input: TInput): Promise<TOutput>;
}

export type DisclosureResult = {
  title: string;
  url: string;
  publishedAt?: string;
};

export type QuoteSnapshot = {
  ticker: string;
  changePercent?: number;
  volumeChangePercent?: number;
  price?: string;
};

export type SearchResult = {
  title: string;
  snippet: string;
  url: string;
};
