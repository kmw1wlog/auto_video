import type { RenderMode, ReelStoryboard, StoryboardMarketEvent } from "../storyboard/types.js";
import { validateStoryboard } from "../storyboard/validateStoryboard.js";
import { createMockStoryboard } from "./mockStoryboardPlanner.js";
import { STORYBOARD_PLANNER_PROMPT } from "./prompt.js";

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

export async function createOpenAiStoryboard(input: {
  runId: string;
  event: StoryboardMarketEvent;
  mode: RenderMode;
}): Promise<ReelStoryboard> {
  if (!process.env.OPENAI_API_KEY) {
    return createMockStoryboard({ ...input, providerUsage: { openAi: false } });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_STORYBOARD_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: STORYBOARD_PLANNER_PROMPT },
          { role: "user", content: JSON.stringify(input.event) }
        ]
      })
    });

    if (!response.ok) {
      return createMockStoryboard({ ...input, providerUsage: { openAi: false } });
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(extractJson(content)) as ReelStoryboard;
    const errors = validateStoryboard(parsed);
    if (errors.length > 0) {
      return createMockStoryboard({ ...input, providerUsage: { openAi: false } });
    }
    return {
      ...parsed,
      runId: input.runId,
      mode: input.mode,
      providerUsage: {
        ...parsed.providerUsage,
        openAi: true
      }
    };
  } catch {
    return createMockStoryboard({ ...input, providerUsage: { openAi: false } });
  }
}
