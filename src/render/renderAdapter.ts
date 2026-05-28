import type { RenderInput, RenderResult } from "../types/render.js";

export interface RenderAdapter {
  render(input: RenderInput): Promise<RenderResult>;
}
