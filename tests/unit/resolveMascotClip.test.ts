import { describe, expect, it } from "vitest";
import { resolveMascotClip } from "../../src/assets/resolveMascotClip.js";

describe("resolveMascotClip", () => {
  it("clip이 없으면 PNG fallback을 반환해서 렌더링을 계속할 수 있게 한다", async () => {
    const result = await resolveMascotClip("shock_jump");
    expect(result.action).toBe("shock_jump");
    expect(result.path.endsWith(".png")).toBe(true);
    expect(result.source).toBe("fallback");
  });
});
