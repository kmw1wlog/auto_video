# AI 인플루언서 콘텐츠 자동 발행 시스템 구현 노트

## 1. 전체 워크플로우 단계 (n8n 구성)

### ① 트리거 및 데이터 수집
*   **Schedule Trigger 노드**: 매일 오전 10:30분 실행 등 특정 주기로 반복 트리거 설정.
*   **Google Sheets (Get Rows) 노드**:
    *   필터 조건: `Status = '기획'`인 행만 검색.
    *   옵션: `return only first matching row` 활성화 (한 번에 가장 오래된 기획안 1개만 처리).

### ② AI 기획 및 프롬프트 생성
*   **OpenAI (Message Model) 노드**:
    *   모델: `GPT-4o` (or `GPT-5` 계열).
    *   **System Prompt**: 여행 브이로그 영상 기획을 지시하고, 출력 형식을 JSON(`title`, `description`, `prompt`)으로 고정. 캐릭터 호출을 위해 프롬프트 내에 골뱅이 기호와 캐릭터 아이디(`@character_username`)를 포함하도록 구성.
    *   **User Prompt**: 구글 시트에서 가져온 여행지 키워드(`{{ $json.trip_keyword }}`) 전달.
    *   옵션: `Response Format = JSON Object` 설정.

### ③ 비디오 생성 요청 (API 연동)
*   *오픈AI Sora API의 높은 비용 절감을 위해 제3자 리셀러 서비스인 **Keiz.ai(키에 AI) API** 활용.*
*   **HTTP Request (Post) 노드**:
    *   **Method**: `POST`
    *   **URL**: Keiz.ai의 Sora 2 Pro 텍스트-비디오 변환 엔드포인트
    *   **Authentication**: Bearer Token (Keiz.ai에서 발급받은 API Key)
    *   **Body Parameters (JSON)**:
        *   `model`: `"sora-2-pro-text-to-video"`
        *   `input.prompt`: `{{ $json.prompt }}` (GPT 노드에서 생성된 프롬프트)
        *   `input.aspect_ratio`: `"portrait"` (숏폼용 세로 비율)
        *   `input.end_frames`: 구글 시트의 영상 길이(초) 데이터를 문자열로 변환해 매핑 (`{{ $json.length.toString() }}`)
        *   `input.size`: `"high"`
        *   `input.remove_watermark`: 워터마크 제거 불리언 값 설정 (`{{ true }}` 자바스크립트 식으로 전달)

### ④ 지연 및 비디오 URL 조회
*   **Wait 노드**: 비디오 렌더링 대기를 위해 10분(10 Minutes)간 일시정지.
*   **HTTP Request (Get) 노드**:
    *   **Method**: `GET`
    *   **URL**: `https://.../query_task?task_id={{ $json.task_id }}` (Keiz.ai의 태스크 결과 조회 API)
*   **Code (JavaScript) 노드**: API 응답 데이터(JSON)에서 최종 영상 파일 경로인 `.mp4` URL만 추출하는 코드 실행.
*   **HTTP Request (Get) 노드**: 추출한 MP4 URL에서 비디오 파일을 바이너리(Binary) 데이터로 다운로드.

### ⑤ SNS 다중 업로드 (블로테이터 연동)
*   *인스타그램, 쓰레드, 유튜브 등 다중 채널 통합 업로드를 위해 **Bloteato(블로테이터) 커뮤니티 노드** 활용.*
*   **Bloteato (Upload Media) 노드**: 다운로드한 바이너리 비디오를 블로테이터 서버에 사전 업로드.
*   **Bloteato (Create Post) 노드 (3개 분기)**:
    *   **Instagram 분기**: GPT가 생성한 제목/설명과 함께 릴스로 업로드.
    *   **Threads 분기**: 미디어와 텍스트 포스팅.
    *   **YouTube 분기**: 유튜브 쇼츠로 업로드 (공개 상태는 `Private(비공개)` 설정 권장).

### ⑥ 데이터베이스 업데이트
*   **Google Sheets (Update Row) 노드**:
    *   업데이트 대상 행 매핑: `Row Number` 일치 필터 적용.
    *   `Status` 값을 `'배포'`로 변경.
    *   `Published At` 필드에 배포 시점 타임스탬프 기록.
        *   포맷팅 수식: `{{ $json.timestamp.toDateTime().format('yyyy-MM-dd HH:mm') }}`

---

## 2. 미완 자동화 및 수동 작업 지점 (Gap Points)

*   **Sora AI 인플루언서 캐릭터 최초 생성 (100% 수동)**:
    *   오픈AI Sora 공식 웹사이트에서 원하는 가상 인물 프롬프트를 입력하여 비디오를 1차 생성해야 함.
    *   생성된 영상 내에서 인물 구도가 좋은 구간을 지정하여 `Create Character` 기능을 통해 캐릭터로 등록해야 함.
    *   등록 시 설정한 고유 유저네임(`@username`)이 있어야만 향후 API에서 동일한 외모/목소리로 인물을 호출할 수 있음.
*   **캐릭터 동기화 시간차**:
    *   Sora 공식 홈페이지에서 생성한 커스텀 캐릭터 권한을 'Everyone'으로 열어두더라도, 외부 API(Keiz.ai 등)에 해당 정보가 연동되어 호출 가능해질 때까지 **약 하루(24시간)의 물리적 시간차**가 발생하므로 대기 후 자동화를 구동해야 함.
*   **플랫폼 API 키 및 계정 연동**:
    *   OpenAI API Key, Keiz.ai API Key의 직접 발급 및 n8n 수동 등록.
    *   Bloteato 웹 서비스 가입 및 인스타그램 프로페셔널 계정, 페이스북 페이지, 쓰레드, 유튜브 채널의 최초 권한 허용(OAuth 연동) 설정 필요.
*   **배포 즉시 확인의 지연**:
    *   블로테이터 API를 통해 포스팅이 성공적으로 전송(Success 200)되더라도 각 SNS 플랫폼 정책 및 인코딩 처리에 따라 채널에 최종 노출되기까지 몇 분의 대기 시간이 발생하므로 모니터링이 필요함.