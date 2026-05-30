# Market Detective Reels Automation MVP

시장탐정 릴스 자동화 MVP는 국장·미장 종목 이슈를 샘플 데이터에서 읽어 정규화, 중요도 점수화, mock 기획/대본 생성, 자막 생성, 마스코트 overlay, 9:16 MP4 렌더링, 검수 패키지 생성, Instagram dry-run payload 생성까지 로컬에서 끝까지 실행하는 프로젝트입니다.

현재 버전은 API 키가 없어도 동작하는 local MVP입니다. 기본 실행은 sample/mock/dry-run이며, OpenAI/OpenDART/KIS/Search/Fal ElevenLabs TTS는 환경변수가 있을 때만 최소 adapter를 통해 시도합니다. 실패해도 샘플 렌더링은 계속 진행합니다.

## 시장탐정 채널

- 채널명: 시장탐정
- 핸들: `market_detective`
- 설명: 국장·미장 이슈 브리핑
- 기본 영상 톤: 큰 화제 hook, 시장탐정 등장, 핵심 설명, 캐릭터 리액션, 체크포인트, CTA
- 고정 문구: `본 영상은 투자 참고용이며, 투자 판단은 본인 책임입니다.`

`chainRadar` 설정은 `src/config/channels.ts`에 future config로만 존재합니다. 이번 MVP 플로우에서는 사용하지 않으며, 추후 시장탐정 config를 복제/변형해 확장하는 전제로 둡니다.

## 설치

```bash
npm install
```

FFmpeg는 `ffmpeg-static`을 사용합니다. FFmpeg 실행 실패가 발생하면 `npm install`을 다시 실행하고, `node_modules/ffmpeg-static`에 binary가 설치됐는지 확인하세요.

## 환경변수

실제 키는 `.env`에만 넣고 커밋하지 않습니다. 레포에는 `.env.example`만 포함합니다.

```bash
cp .env.example .env
```

주요 변수:

- `OPENAI_API_KEY`: 선택. storyboard planner/TTS에 사용
- `OPENDART_API_KEY`: 선택. 공시 후보 조회
- `KIS_APP_KEY`, `KIS_APP_SECRET`: 선택. quote-only skeleton
- `SEARCH_PROVIDER`: `none`, `perplexity`, `brave`
- `PERPLEXITY_API_KEY`, `BRAVE_SEARCH_API_KEY`: 선택. 검색 후보
- `MARKET_DETECTIVE_MODE`: `full_auto` 또는 `semi_manual`
- `USE_OPENAI_PLANNER`, `USE_OPENAI_TTS`: OpenAI 사용 여부
- `USE_FAL_ELEVENLABS_TTS`, `FAL_KEY`: 선택. Fal ElevenLabs v3 TTS 사용 여부와 서버 키
- `USE_AUDIBLE_MOCK_TTS`: 선택. API 키 없이 검수할 때 무음 대신 낮은 볼륨의 placeholder 오디오 생성
- `SOURCE_POLL_INTERVAL_HOURS`: 운영 수집 주기 기본값. n8n production skeleton은 3시간 기준

Kie/Creatomate/Buffer 및 미장/코인 관련 키 변수명도 `.env.example`에 비워 둔 placeholder로만 정리했습니다. 주문/계좌/매매 API는 이번 버전에서 호출하지 않습니다.

## 마스코트 이미지와 클립

운영 시 실제 시장탐정 마스코트 이미지를 아래 파일로 교체하세요.

```text
assets/mascot/market-detective/market_detective.png
```

기존 MVP 경로인 `assets/mascot/market-detective.png`도 fallback으로 인식합니다. 파일이 없으면 테스트와 로컬 dry-run이 실패하지 않도록 `tests/fixtures/mascot-placeholder.png`를 사용합니다.

마스코트 모션 클립은 아래 폴더에 넣습니다.

```text
assets/mascot/market-detective/clips/
```

인식하는 파일명:

- `00_idle_breath.mp4`
- `01_clock_intro.mp4`
- `02_magnifier_pop.mp4`
- `03_shock_jump.mp4`
- `04_funny_reaction.mp4`
- `05_warning_sign.mp4`
- `06_point_chart.mp4`
- `07_cta_point_down.mp4`
- `08_document_found.mp4`

clip이 있으면 scene별 `mascotAction`에 매핑하고, 없으면 PNG fallback으로 렌더링합니다. 렌더러는 장면 전환 구간마다 마스코트를 짧게 등장시켜 목표 영상의 편집 문법을 따릅니다.

## Manual Asset Override

`semi_manual` 또는 큰 이슈 편집용 수작업 이미지는 아래에 넣습니다.

```text
data/manual-assets/{runId}/
```

인식 파일:

- `hero.png`: Shock Hook 우선 사용
- `source_1.png`: What Happened 우선 사용
- `chart.png`: Why It Matters 우선 사용
- `source_2.png`, `extra_1.png`, `extra_2.png`: 확장 슬롯

파일이 없으면 generated card로 fallback하며, 사용 여부는 `review.html`과 `asset-log.json`에 기록됩니다.

## 목표영상 Reference 분석

목표영상은 레포에 커밋하지 않습니다. 로컬에 아래 경로로 둘 수 있습니다.

```text
reference/target_reel.mp4
```

분석 및 샘플 렌더:

```bash
npm run market-detective:reference
```

분석 결과는 `data/reference/target_reel_analysis.md`에 저장됩니다. 목표영상을 복제하지 않고, hook/card/mascot/subtitle/CTA 편집 문법만 추상화해 7-scene storyboard에 반영합니다.

## 샘플 파이프라인 실행

```bash
npm run market-detective:sample
```

실행 결과는 `data/output/{runId}/` 아래에 생성됩니다.

- `video.mp4`
- `thumbnail.png`
- `storyboard.json`
- `subtitles.ass`
- `asset-log.json`
- `review.json`
- `review.html`
- `instagram-dry-run.json`

## API 서버

```bash
npm run dev
```

기본 포트는 `3000`입니다.

- `GET /health`
- `POST /api/market-detective/run-sample`
- `GET /api/market-detective/runs/latest`
- `GET /api/market-detective/runs/:runId`

## n8n Workflow

n8n에서 아래 JSON을 import할 수 있습니다.

- `n8n/workflow.market-detective.local.json`
- `n8n/workflow.market-detective.production-skeleton.json`

local workflow는 `POST http://localhost:3000/api/market-detective/run-sample`을 호출해 로컬 샘플 플로우를 실행합니다. production skeleton은 3시간 주기 수집을 기본으로 두며, 실제 API 키를 요구하지 않는 placeholder/TODO 골격입니다.

## 테스트

```bash
npm run test
npm run test:integration
npm run test:e2e
npm run check
```

`npm run check`는 전체 Vitest suite를 실행한 뒤 샘플 릴스 생성까지 수행하는 최종 검증 명령입니다. API 키가 없다는 이유로 skip되는 테스트는 없습니다.

## Output 확인

생성된 검수 페이지를 브라우저로 열면 영상, 목표 scene grammar, storyboard JSON, scene별 시간/문구/asset, 마스코트 clip/fallback, source URL, moderation 결과, provider 사용 여부, Instagram caption preview를 확인할 수 있습니다.

```text
data/output/{runId}/review.html
```

## Adapter 교체 지점

- `SampleSource` → DART/KRX/SEC/뉴스 API Source
- `MockStoryboardPlanner` → OpenAI LLM Planner
- `MockTTS` → Fal ElevenLabs TTS 또는 OpenAI TTS
- `StoryboardFfmpegRenderer` → Remotion 또는 내부 FFmpeg 고도화
- `InstagramDryRunPublisher` → Instagram Graph API Publisher
- Local JSON/SQLite Store → Postgres/Supabase

외부 영상 렌더링 API, 자막/STT API, Instagram 자동 게시, 관리자 웹, DB/회원 기능은 이번 범위가 아닙니다. ElevenLabs TTS는 Fal queue adapter로 연결되어 있으며, 키가 없으면 mock audio로 fallback합니다.

## 금지 표현 정책

대본, 자막, caption은 금칙어 검사를 통과해야 합니다. 매수/매도 추천, 목표가, 수익 보장, 리딩방/상담 유도 표현은 차단합니다. 정상 표현은 `체크포인트`, `관찰 포인트`, `원문 확인`, `시장 반응`, `추가 확인 필요`, `공식자료` 중심입니다.

## 한계

- 실제 Instagram 게시 없음
- API 키가 없으면 OpenAI/DART/KIS/Search 호출 없음
- 마스코트 AI 모션 생성 없음
- 체인레이더는 추후 확장용 config만 존재
