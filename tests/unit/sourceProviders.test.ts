import { afterEach, describe, expect, it } from "vitest";
import { OpenDartProvider } from "../../src/sources/openDartProvider.js";
import { KisQuoteProvider } from "../../src/sources/kisQuoteProvider.js";
import { WebSearchProvider } from "../../src/sources/webSearchProvider.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("source provider configured state", () => {
  it("OpenDART key가 없으면 configured=false이고 빈 결과로 fallback한다", async () => {
    delete process.env.OPENDART_API_KEY;
    const provider = new OpenDartProvider();
    expect(provider.isConfigured()).toBe(false);
    await expect(provider.fetch({ ticker: "005930" })).resolves.toEqual([]);
  });

  it("KIS key와 secret이 모두 있어야 configured=true다", () => {
    process.env.KIS_APP_KEY = "test";
    delete process.env.KIS_APP_SECRET;
    expect(new KisQuoteProvider().isConfigured()).toBe(false);

    process.env.KIS_APP_SECRET = "test";
    expect(new KisQuoteProvider().isConfigured()).toBe(true);
  });

  it("Search provider none은 외부 호출 없이 빈 결과를 반환한다", async () => {
    const provider = new WebSearchProvider("none");
    expect(provider.isConfigured()).toBe(false);
    await expect(provider.fetch({ query: "삼성전자 공시" })).resolves.toEqual([]);
  });
});
