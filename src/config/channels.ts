export const CHANNELS = {
  marketDetective: {
    id: "market-detective",
    displayName: "시장탐정",
    handle: "market_detective",
    description: "국장·미장 이슈 브리핑",
    theme: {
      background: "#111111",
      primary: "#FFD43B",
      secondary: "#18A058",
      text: "#FFFFFF"
    },
    mascotPath: "assets/mascot/market-detective.png",
    fallbackMascotPath: "tests/fixtures/mascot-placeholder.png",
    disclaimer: "본 영상은 투자 참고용이며, 투자 판단은 본인 책임입니다.",
    cta: "더 자세한 자료는 공식 링크에서 확인하세요."
  },
  chainRadar: {
    id: "chain-radar",
    displayName: "체인레이더",
    status: "future",
    note: "이번 MVP에서는 구현하지 않는다. 시장탐정 플로우 완성 후 분기해서 재사용할 예정."
  }
} as const;

export type MarketDetectiveChannel = typeof CHANNELS.marketDetective;

export function getMarketDetectiveChannel(): MarketDetectiveChannel {
  return CHANNELS.marketDetective;
}
