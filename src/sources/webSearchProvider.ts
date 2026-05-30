import type { SearchResult, SourceProvider } from "./types.js";

export type WebSearchInput = {
  query: string;
};

export class WebSearchProvider implements SourceProvider<WebSearchInput, SearchResult[]> {
  name = "web-search";

  constructor(private readonly provider = process.env.SEARCH_PROVIDER ?? "none") {}

  isConfigured(): boolean {
    if (this.provider === "perplexity") return Boolean(process.env.PERPLEXITY_API_KEY);
    if (this.provider === "brave") return Boolean(process.env.BRAVE_SEARCH_API_KEY);
    return false;
  }

  async fetch(input: WebSearchInput): Promise<SearchResult[]> {
    if (!this.isConfigured()) return [];
    try {
      if (this.provider === "brave") {
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input.query)}&count=5`, {
          headers: {
            "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY ?? "",
            Accept: "application/json"
          }
        });
        if (!response.ok) return [];
        const json = (await response.json()) as { web?: { results?: Array<{ title: string; description?: string; url: string }> } };
        return (json.web?.results ?? []).map((item) => ({
          title: item.title,
          snippet: item.description ?? "",
          url: item.url
        }));
      }

      if (this.provider === "perplexity") {
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY ?? ""}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: "Return compact search candidates as JSON array with title, snippet, url." },
              { role: "user", content: input.query }
            ]
          })
        });
        if (!response.ok) return [];
        const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = json.choices?.[0]?.message?.content ?? "[]";
        const parsed = JSON.parse(content) as SearchResult[];
        return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
      }
    } catch {
      return [];
    }

    return [];
  }
}
