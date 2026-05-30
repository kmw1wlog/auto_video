import type { DisclosureResult, SourceProvider } from "./types.js";

export type OpenDartInput = {
  corpCode?: string;
  ticker?: string;
};

export class OpenDartProvider implements SourceProvider<OpenDartInput, DisclosureResult[]> {
  name = "opendart";

  isConfigured(): boolean {
    return Boolean(process.env.OPENDART_API_KEY);
  }

  async fetch(input: OpenDartInput): Promise<DisclosureResult[]> {
    if (!this.isConfigured()) return [];
    try {
      const params = new URLSearchParams({
        crtfc_key: process.env.OPENDART_API_KEY ?? "",
        bgn_de: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10).replace(/-/g, ""),
        page_count: "5"
      });
      if (input.corpCode) params.set("corp_code", input.corpCode);
      const response = await fetch(`https://opendart.fss.or.kr/api/list.json?${params.toString()}`);
      if (!response.ok) return [];
      const json = (await response.json()) as { list?: Array<{ report_nm: string; rcept_no: string; rcept_dt?: string }> };
      return (json.list ?? []).map((item) => ({
        title: item.report_nm,
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
        publishedAt: item.rcept_dt
      }));
    } catch {
      return [];
    }
  }
}
