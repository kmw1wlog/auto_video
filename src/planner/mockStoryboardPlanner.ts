import type { RenderMode, ReelStoryboard, StoryboardMarketEvent, StoryboardScene } from "../storyboard/types.js";
import { DEFAULT_SCENE_TIMINGS } from "../storyboard/types.js";
import { buildSubtitles } from "../subtitles/subtitleBuilder.js";
import { detectForbiddenTerms } from "../moderation/detectForbiddenTerms.js";

function topNumber(event: StoryboardMarketEvent, label: string): string {
  return event.numbers.find((number) => number.label.includes(label))?.value ?? "-";
}

function hookCandidates(event: StoryboardMarketEvent): string[] {
  const name = event.companyName ?? event.ticker ?? "이 종목";
  return [
    `${name}, 오늘 시장에서 갑자기 시선이 몰렸습니다`,
    `방금 포착된 ${name} 변동성, 이유를 30초로 정리합니다`,
    `${name} 이슈, 숫자와 원문 기준으로만 보겠습니다`
  ];
}

export function createMockStoryboard(input: {
  runId: string;
  event: StoryboardMarketEvent;
  mode: RenderMode;
  providerUsage?: Partial<ReelStoryboard["providerUsage"]>;
}): ReelStoryboard {
  const { event, runId, mode } = input;
  const name = event.companyName ?? event.ticker ?? "시장 이슈";
  const hooks = hookCandidates(event);
  const price = topNumber(event, "가격");
  const volume = topNumber(event, "거래량");
  const sourceName = event.sourceUrls[0] ? "원문 자료" : "샘플 자료";

  const sceneCopy: Record<StoryboardScene["kind"], Pick<StoryboardScene, "headline" | "bodyLines" | "subtitle">> = {
    shock_hook: {
      headline: hooks[0],
      bodyLines: [`${name} 이슈 포착`, "큰 숫자보다 흐름을 먼저 봅니다"],
      subtitle: `${name}, 오늘 시장에서 크게 주목받았습니다`
    },
    detective_intro: {
      headline: "시장탐정 출동",
      bodyLines: ["핵심만 정리했습니다", "30초만 집중"],
      subtitle: "시장탐정이 핵심만 정리했습니다"
    },
    what_happened: {
      headline: "무슨 일이 있었나",
      bodyLines: [event.headline, event.summary],
      subtitle: `${sourceName} 기준으로 사건을 먼저 확인합니다`
    },
    why_it_matters: {
      headline: "왜 시장이 반응했나",
      bodyLines: [`가격 ${price}`, `거래량 ${volume}`, `키워드 ${event.keywords.slice(0, 3).join(" / ")}`],
      subtitle: `가격과 거래량이 동시에 움직인 구간입니다`
    },
    detective_reaction: {
      headline: "근데 여기서 끝이 아닙니다",
      bodyLines: ["반응보다 중요한 건 다음 확인입니다"],
      subtitle: "근데 여기서 끝이 아닙니다"
    },
    checkpoint: {
      headline: "체크포인트 3개",
      bodyLines: ["원문 확인", "거래량/수급 확인", "추가 공시 확인"],
      subtitle: "투자 판단 전에는 세 가지를 확인해야 합니다"
    },
    cta: {
      headline: "자료는 댓글/프로필 링크",
      bodyLines: ["공식자료 중심으로 확인하세요", "투자 판단은 본인 책임입니다"],
      subtitle: "자료는 댓글이나 프로필 링크에서 확인하세요"
    }
  };

  const scenes: StoryboardScene[] = DEFAULT_SCENE_TIMINGS.map((timing, index) => ({
    id: `scene-${index + 1}-${timing.kind}`,
    ...timing,
    ...sceneCopy[timing.kind],
    assetSource: "generated"
  }));

  const narrationScript = scenes.map((scene) => scene.subtitle).join(" ");
  const instagramCaption = [
    `[시장탐정] ${name} 이슈 정리`,
    event.headline,
    "원문, 숫자, 체크포인트 중심으로 확인하세요.",
    "본 영상은 투자 참고용이며, 투자 판단은 본인 책임입니다.",
    "#시장탐정 #시장뉴스 #공시체크"
  ].join("\n");
  const blockedTerms = detectForbiddenTerms(`${narrationScript}\n${instagramCaption}`);

  return {
    runId,
    channel: "market_detective",
    mode,
    title: `${name} 이슈 추적`,
    hookCandidates: hooks,
    scenes,
    narrationScript,
    subtitles: buildSubtitles(narrationScript, 30),
    instagramCaption,
    disclaimer: "본 영상은 투자 참고용이며, 투자 판단은 본인 책임입니다.",
    sourceUrls: event.sourceUrls,
    assetLog: [],
    moderation: {
      passed: blockedTerms.length === 0,
      warnings: blockedTerms.length > 0 ? ["금칙어가 감지되어 검수가 필요합니다."] : [],
      blockedTerms
    },
    providerUsage: {
      openAi: false,
      openDart: false,
      kis: false,
      search: "none",
      tts: "silent",
      ...input.providerUsage
    }
  };
}
