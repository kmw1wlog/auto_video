import path from "node:path";
import { generateFallbackCard } from "../assets/generateFallbackCards.js";
import { resolveMascotClip } from "../assets/resolveMascotClip.js";
import { detectForbiddenTerms } from "../moderation/detectForbiddenTerms.js";
import { createOpenAiContentPlan } from "../planner/openAiContentPlanner.js";
import type { ContentCsvRow } from "../sources/contentCsvProvider.js";
import { buildSubtitles } from "../subtitles/subtitleBuilder.js";
import type { ReelStoryboard, StoryboardScene } from "./types.js";
import { DEFAULT_SCENE_TIMINGS } from "./types.js";

export async function createContentSheetStoryboard(input: {
  runDir: string;
  runId: string;
  row: ContentCsvRow;
  mode: ReelStoryboard["mode"];
  useOpenAiPlanner: boolean;
  sourceUrls: string[];
  searchProvider: ReelStoryboard["providerUsage"]["search"];
  automationNotes?: string;
}): Promise<ReelStoryboard> {
  const planned = await createOpenAiContentPlan({
    row: input.row,
    useOpenAiPlanner: input.useOpenAiPlanner,
    automationNotes: input.automationNotes
  });

  const baseScenes: StoryboardScene[] = DEFAULT_SCENE_TIMINGS.map((timing, index) => ({
    id: `scene-${index + 1}-${timing.kind}`,
    ...timing,
    headline: planned.plan.scenes[index]?.headline ?? planned.plan.title,
    bodyLines: planned.plan.scenes[index]?.bodyLines ?? [],
    subtitle: planned.plan.scenes[index]?.subtitle ?? "",
    assetSource: "generated"
  }));

  const scenes: StoryboardScene[] = [];
  const assetLog: ReelStoryboard["assetLog"] = [];
  for (const scene of baseScenes) {
    const assetPath = await generateFallbackCard(input.runDir, scene);
    const mascot = await resolveMascotClip(scene.mascotAction);
    assetLog.push({ sceneId: scene.id, assetPath, source: "generated", note: "CSV/script generated fallback card" });
    assetLog.push({
      sceneId: `${scene.id}-mascot`,
      assetPath: mascot.path,
      source: mascot.source === "clip" ? "manual" : "fallback",
      note: mascot.note
    });
    scenes.push({
      ...scene,
      assetPath: path.normalize(assetPath),
      mascotClipPath: path.normalize(mascot.path)
    });
  }

  const blockedTerms = detectForbiddenTerms(`${planned.plan.narrationScript}\n${planned.plan.instagramCaption}`);
  return {
    runId: input.runId,
    channel: "market_detective",
    mode: input.mode,
    title: planned.plan.title,
    hookCandidates: planned.plan.hookCandidates,
    scenes,
    narrationScript: planned.plan.narrationScript,
    subtitles: buildSubtitles(planned.plan.narrationScript, 30),
    instagramCaption: planned.plan.instagramCaption,
    disclaimer: "본 영상은 정보 제공 목적이며, 투자 판단과 책임은 사용자 본인에게 있습니다.",
    sourceUrls: input.sourceUrls,
    assetLog,
    moderation: {
      passed: blockedTerms.length === 0,
      warnings: [
        ...(blockedTerms.length > 0 ? ["금칙어가 감지되어 검수가 필요합니다."] : []),
        ...(planned.error ? [`OpenAI planner fallback: ${planned.error}`] : [])
      ],
      blockedTerms
    },
    providerUsage: {
      openAi: planned.usedOpenAi,
      openDart: false,
      kis: false,
      search: input.searchProvider,
      tts: "silent"
    }
  };
}
