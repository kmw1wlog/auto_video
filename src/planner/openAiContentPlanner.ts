import type { ContentCsvRow } from "../sources/contentCsvProvider.js";

export type ContentScenePlan = {
  headline: string;
  bodyLines: string[];
  subtitle: string;
};

export type ContentPlan = {
  title: string;
  hookCandidates: string[];
  scenes: ContentScenePlan[];
  narrationScript: string;
  instagramCaption: string;
};

function sentenceChunks(text: string, count: number): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？]|요\.|다\.)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (sentences.length === 0) return Array.from({ length: count }, () => text.slice(0, 80));

  const chunks = Array.from({ length: count }, () => "");
  sentences.forEach((sentence, index) => {
    chunks[index % count] = `${chunks[index % count]} ${sentence}`.trim();
  });
  return chunks.map((chunk) => chunk.slice(0, 95));
}

export function createFallbackContentPlan(row: ContentCsvRow): ContentPlan {
  const chunks = sentenceChunks(row.script, 7);
  const scenes: ContentScenePlan[] = [
    { headline: row.title, bodyLines: [row.keyword, row.target].filter(Boolean), subtitle: chunks[0] },
    { headline: "오늘의 핵심", bodyLines: [row.description.slice(0, 76)], subtitle: chunks[1] },
    { headline: "숫자로 보면", bodyLines: [chunks[2]], subtitle: chunks[2] },
    { headline: "왜 주목받나", bodyLines: [chunks[3]], subtitle: chunks[3] },
    { headline: "여기서 확인", bodyLines: [chunks[4]], subtitle: chunks[4] },
    { headline: "체크포인트", bodyLines: [chunks[5], "원문과 맥락을 함께 확인"], subtitle: chunks[5] },
    { headline: "저장하고 다시 보기", bodyLines: ["자료와 출처를 확인하세요"], subtitle: chunks[6] }
  ];
  const narrationScript = scenes.map((scene) => scene.subtitle).join(" ").slice(0, 430);
  const tags = row.tags.map((tag) => `#${tag.replace(/^#/, "").replace(/\s+/g, "")}`).slice(0, 8).join(" ");

  return {
    title: row.title,
    hookCandidates: [row.title, `${row.keyword} 핵심만 30초`, `${row.target}이 지금 확인할 이슈`].filter(Boolean),
    scenes,
    narrationScript,
    instagramCaption: [row.title, row.description, tags].filter(Boolean).join("\n")
  };
}

function normalizePlan(value: unknown, fallback: ContentPlan): ContentPlan {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Partial<ContentPlan>;
  const scenes = Array.isArray(record.scenes)
    ? record.scenes.slice(0, 7).map((scene) => {
        const sceneRecord = scene as Partial<ContentScenePlan>;
        return {
          headline: String(sceneRecord.headline ?? fallback.title).slice(0, 42),
          bodyLines: Array.isArray(sceneRecord.bodyLines)
            ? sceneRecord.bodyLines.map(String).slice(0, 3)
            : [],
          subtitle: String(sceneRecord.subtitle ?? "").slice(0, 90)
        };
      })
    : fallback.scenes;

  if (scenes.length !== 7 || scenes.some((scene) => !scene.subtitle)) return fallback;
  return {
    title: String(record.title ?? fallback.title).slice(0, 58),
    hookCandidates: Array.isArray(record.hookCandidates)
      ? record.hookCandidates.map(String).slice(0, 3)
      : fallback.hookCandidates,
    scenes,
    narrationScript: String(record.narrationScript ?? scenes.map((scene) => scene.subtitle).join(" ")).slice(0, 460),
    instagramCaption: String(record.instagramCaption ?? fallback.instagramCaption).slice(0, 1800)
  };
}

export async function createOpenAiContentPlan(input: {
  row: ContentCsvRow;
  useOpenAiPlanner: boolean;
  automationNotes?: string;
}): Promise<{ plan: ContentPlan; usedOpenAi: boolean; error?: string }> {
  const fallback = createFallbackContentPlan(input.row);
  if (!input.useOpenAiPlanner || !process.env.OPENAI_API_KEY) {
    return { plan: fallback, usedOpenAi: false };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PLANNER_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "한국어 숏폼 자동화 기획자입니다. 원문 대본을 30초 릴스용 7장면 JSON으로 압축합니다. 과장, 수익 보장, 투자 추천 문구는 금지합니다."
          },
          {
            role: "user",
            content: JSON.stringify({
              requiredShape: {
                title: "string",
                hookCandidates: ["string", "string", "string"],
                scenes: [
                  { headline: "string", bodyLines: ["string"], subtitle: "string" }
                ],
                narrationScript: "string",
                instagramCaption: "string"
              },
              sceneRules: [
                "0-3초: 강한 후킹",
                "3-6초: 오늘의 핵심",
                "6-11초: 숫자/근거",
                "11-17초: 왜 중요한지",
                "17-21초: 마스코트 리액션용 전환 멘트",
                "21-27초: 체크포인트",
                "27-30초: 저장/프로필 링크 CTA"
              ],
              automationNotes: input.automationNotes?.slice(0, 1800),
              contentRow: input.row
            })
          }
        ]
      })
    });
    if (!response.ok) throw new Error(`OpenAI planner HTTP ${response.status}`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    return { plan: normalizePlan(JSON.parse(content), fallback), usedOpenAi: true };
  } catch (error) {
    return {
      plan: fallback,
      usedOpenAi: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
