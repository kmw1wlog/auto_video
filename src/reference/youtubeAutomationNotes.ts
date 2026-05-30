import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "../utils/file.js";

function stripVtt(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .filter((line) => line && !line.includes("-->") && !line.startsWith("WEBVTT") && !line.startsWith("Kind:") && !line.startsWith("Language:"))
    .map((line) => line.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim())
    .filter(Boolean)
    .filter((line, index, lines) => line !== lines[index - 1])
    .join(" ")
    .replace(/\s+/g, " ");
}

function fallbackNotes(): string {
  return [
    "# YouTube Shorts API Automation Notes",
    "",
    "- 입력은 시트/CSV 행에서 가져온다: 타깃, 키워드, 제목, 설명, 스크립트, 태그, 보이스 ID, 상태.",
    "- 스케줄 트리거는 정기 실행을 담당한다. 운영 기본값은 3시간이며, 특종/속보 webhook을 병행할 수 있다.",
    "- AI 노드는 제목, 설명, 영상 프롬프트, 30초 내레이션, SNS caption을 JSON으로 만든다.",
    "- 영상 생성 결과는 업로드 가능한 media URL로 변환한 뒤, Instagram/Threads/YouTube 등 채널별 게시 payload에 재사용한다.",
    "- 게시 직후 URL이 바로 보이지 않을 수 있으므로 submission ID와 status를 먼저 기록하고, 후속 확인 작업을 분리한다.",
    "- 실제 게시는 승인 이후에만 실행한다. 로컬 자동화는 dry-run payload와 검수 HTML을 남긴다."
  ].join("\n");
}

export async function createYoutubeAutomationNotes(input: {
  vttPath: string;
  outputPath?: string;
}): Promise<{ notesPath: string; provider: "gemini" | "fallback"; error?: string }> {
  const outputPath = input.outputPath ?? "data/reference/youtube_shorts_api_automation_notes.md";
  await ensureDir(path.dirname(outputPath));
  const transcript = stripVtt(await readFile(input.vttPath, "utf8")).slice(0, 24_000);

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    await writeFile(outputPath, fallbackNotes());
    return { notesPath: outputPath, provider: "fallback" };
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": key
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: [
                  "다음 유튜브 자동화 강의 자막을 바탕으로, 코드 자동화에 필요한 구현 노트만 한국어 Markdown bullet로 요약하세요.",
                  "원문을 길게 인용하지 말고, 워크플로우 단계와 미완 자동화 지점 중심으로 정리하세요.",
                  transcript
                ].join("\n\n")
              }
            ]
          }
        ]
      })
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const notes = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
    if (!notes) throw new Error("Gemini returned empty notes.");
    await writeFile(outputPath, notes);
    return { notesPath: outputPath, provider: "gemini" };
  } catch (error) {
    await writeFile(outputPath, fallbackNotes());
    return { notesPath: outputPath, provider: "fallback", error: error instanceof Error ? error.message : String(error) };
  }
}
