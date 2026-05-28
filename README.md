# Market Detective Reels Automation MVP

시장탐정 릴스 자동화 MVP는 국장·미장 종목 이슈를 샘플 데이터에서 읽어 정규화, 중요도 점수화, mock 기획/대본 생성, 자막 생성, 마스코트 overlay, 9:16 MP4 렌더링, 검수 패키지 생성, Instagram dry-run payload 생성까지 로컬에서 끝까지 실행하는 프로젝트입니다.

현재 버전은 API 키가 없는 local MVP입니다. OpenAI, DART, 뉴스 API, Creatomate, ElevenLabs, Instagram API는 호출하지 않으며 모두 mock 또는 dry-run adapter로 분리되어 있습니다.

## 시장탐정 채널

- 채널명: 시장탐정
- 핸들: `market_detective`
- 설명: 국장·미장 이슈 브리핑
- 기본 영상 톤: 다크 배경, 노랑 포인트, 초록 보조색
- 고정 문구: `본 영상은 투자 참고용이며, 투자 판단은 본인 책임입니다.`

`chainRadar` 설정은 `src/config/channels.ts`에 future config로만 존재합니다. 이번 MVP 플로우에서는 사용하지 않으며, 추후 시장탐정 config를 복제/변형해 확장하는 전제로 둡니다.

## 설치

```bash
npm install
```

FFmpeg는 `ffmpeg-static`을 사용합니다. FFmpeg 실행 실패가 발생하면 `npm install`을 다시 실행하고, `node_modules/ffmpeg-static`에 binary가 설치됐는지 확인하세요.

## 마스코트 이미지

운영 시 실제 시장탐정 마스코트 이미지를 아래 파일로 교체하세요.

```text
assets/mascot/market-detective.png
```

파일이 없으면 테스트와 로컬 dry-run이 실패하지 않도록 `tests/fixtures/mascot-placeholder.png`를 자동 사용합니다. AI 모션 생성은 포함하지 않았고, FFmpeg overlay 위치와 크기를 시간에 따라 조금 바꿔 bobbing motion처럼 보이게 합니다.

## 샘플 파이프라인 실행

```bash
npm run market-detective:sample
```

실행 결과는 `data/output/{runId}/` 아래에 생성됩니다.

- `video.mp4`
- `thumbnail.png`
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

local workflow는 `POST http://localhost:3000/api/market-detective/run-sample`을 호출해 로컬 샘플 플로우를 실행합니다. production skeleton은 실제 API 키를 요구하지 않는 placeholder/TODO 골격입니다.

## 테스트

```bash
npm run test
npm run test:integration
npm run test:e2e
npm run check
```

`npm run check`는 전체 Vitest suite를 실행한 뒤 샘플 릴스 생성까지 수행하는 최종 검증 명령입니다. API 키가 없다는 이유로 skip되는 테스트는 없습니다.

## Output 확인

생성된 검수 페이지를 브라우저로 열면 영상, 원문 URL, 대본, 자막, Instagram caption을 확인할 수 있습니다.

```text
data/output/{runId}/review.html
```

## Adapter 교체 지점

- `SampleSource` → DART/KRX/SEC/뉴스 API Source
- `MockPlanner` → LLM Planner
- `MockTTS` → OpenAI TTS 또는 ElevenLabs
- `LocalFfmpegRenderer` → Creatomate/Shotstack/Remotion
- `InstagramDryRunPublisher` → Instagram Graph API Publisher
- Local JSON/SQLite Store → Postgres/Supabase

## 한계

- 실제 Instagram 게시 없음
- 실제 OpenAI API 호출 없음
- 실제 DART/뉴스/시세 API 호출 없음
- 실제 TTS 없음
- 마스코트 AI 모션 생성 없음
- 체인레이더는 추후 확장용 config만 존재
