import type { RawMarketEvent } from "../types/event.js";

export interface SourceAdapter {
  loadEvents(): Promise<RawMarketEvent[]>;
}
