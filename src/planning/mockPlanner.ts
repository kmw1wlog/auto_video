import type { NormalizedMarketEvent } from "../types/event.js";
import type { ReelPlan, ReelScene } from "../types/reel.js";
import type { MarketDetectiveChannel } from "../config/channels.js";
import { buildSubtitles } from "../subtitles/subtitleBuilder.js";
import { nowIso } from "../utils/time.js";

function hookFor(event: NormalizedMarketEvent): string {
  if (event.market === "US") {
    return `방금 시장에서 포착된 ${event.assetName} 변동성, 이유는 이것입니다.`;
  }
  if (event.volumeChangePercent >= 100) {
    return `거래량이 갑자기 늘어난 ${event.assetName}, 그냥 지나치면 안 됩니다.`;
  }
  return `오늘 ${event.assetName}가 움직인 이유, 시장탐정이 추적했습니다.`;
}

function eventLabel(event: NormalizedMarketEvent): string {
  const labels: Record<NormalizedMarketEvent["eventType"], string> = {
    news: "뉴스",
    disclosure: "공시",
    earnings: "실적",
    price_move: "가격 변동",
    sector_theme: "섹터 테마"
  };
  return labels[event.eventType];
}

export function createMockReelPlan(
  event: NormalizedMarketEvent,
  channel: MarketDetectiveChannel,
  createdAt = nowIso()
): ReelPlan {
  const hook = hookFor(event);
  const title = `${event.assetName} 이슈 추적`;
  const priceDirection = event.priceChangePercent >= 0 ? "상승" : "하락";
  const narrationScript = [
    hook,
    `${event.market} 시장의 ${event.ticker}, ${event.assetName}에서 ${eventLabel(event)} 신호가 확인됐습니다.`,
    event.summary,
    `가격 변동은 ${event.priceChangePercent.toFixed(1)}% ${priceDirection}, 거래량 변화는 ${event.volumeChangePercent.toFixed(0)}%입니다.`,
    `중요도 점수는 ${event.importanceScore}점으로, 단기 관심이 커진 구간입니다.`,
    `다만 뉴스 해석과 수급은 빠르게 바뀔 수 있어 원문과 추가 공시를 함께 확인해야 합니다.`,
    `${channel.cta} ${channel.disclaimer}`
  ].join(" ");

  const scenes: ReelScene[] = [
    {
      index: 0,
      startSec: 0,
      endSec: 3,
      visualType: "hook",
      onScreenText: hook
    },
    {
      index: 1,
      startSec: 3,
      endSec: 10,
      visualType: "event_summary",
      onScreenText: `${event.assetName} ${eventLabel(event)} 포착`
    },
    {
      index: 2,
      startSec: 10,
      endSec: 18,
      visualType: "key_numbers",
      onScreenText: `가격 ${event.priceChangePercent.toFixed(1)}% / 거래량 ${event.volumeChangePercent.toFixed(0)}%`
    },
    {
      index: 3,
      startSec: 18,
      endSec: 25,
      visualType: "risk_note",
      onScreenText: "원문, 공시, 수급 변화를 함께 체크"
    },
    {
      index: 4,
      startSec: 25,
      endSec: 30,
      visualType: "cta",
      onScreenText: channel.cta
    }
  ];

  return {
    id: `plan-${event.id}`,
    channelId: "market-detective",
    eventId: event.id,
    title,
    hook,
    narrationScript,
    scenes,
    subtitles: buildSubtitles(narrationScript, 30),
    instagramCaption: [
      `[시장탐정] ${event.assetName}(${event.ticker}) 이슈 브리핑`,
      `${event.headline}`,
      `가격 변동 ${event.priceChangePercent.toFixed(1)}%, 거래량 변화 ${event.volumeChangePercent.toFixed(0)}%.`,
      channel.disclaimer,
      "#시장탐정 #주식뉴스 #공시체크"
    ].join("\n"),
    disclaimer: channel.disclaimer,
    cta: channel.cta,
    createdAt
  };
}
