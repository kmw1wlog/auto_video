import type { QuoteSnapshot, SourceProvider } from "./types.js";

export type KisQuoteInput = {
  ticker: string;
  market?: "KR" | "US";
};

export class KisQuoteProvider implements SourceProvider<KisQuoteInput, QuoteSnapshot | undefined> {
  name = "kis-quote";

  isConfigured(): boolean {
    return Boolean(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);
  }

  async fetch(input: KisQuoteInput): Promise<QuoteSnapshot | undefined> {
    if (!this.isConfigured()) return undefined;
    // Quote-only skeleton. Token issuance and account/order APIs are intentionally out of scope.
    return {
      ticker: input.ticker
    };
  }
}
