import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveManualAsset } from "../../src/assets/resolveManualAssets.js";

describe("resolveManualAsset", () => {
  it("manual hero asset이 있으면 generated보다 우선한다", async () => {
    const runId = `manual-test-${Date.now()}`;
    const dir = path.join("data/manual-assets", runId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "hero.png"), Buffer.from("manual"));

    const result = resolveManualAsset(runId, "shock_hook");
    expect(result.source).toBe("manual");
    expect(result.assetPath).toContain("hero.png");
  });

  it("manual asset이 없으면 generated fallback으로 표시한다", () => {
    const result = resolveManualAsset("missing-manual-run", "what_happened");
    expect(result.source).toBe("generated");
    expect(result.note).toContain("generated");
  });
});
