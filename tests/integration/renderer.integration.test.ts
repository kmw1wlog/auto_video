import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LocalFfmpegRenderer } from "../../src/render/localFfmpegRenderer.js";
import { createMockTtsAudio } from "../../src/tts/mockTts.js";
import { buildSubtitles } from "../../src/subtitles/subtitleBuilder.js";
import { ensureFallbackMascotPng } from "../../src/utils/mascot.js";

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);
const ffprobe = requireFromHere("ffprobe-static") as { path: string };

describe("LocalFfmpegRenderer", () => {
  it("MP4와 썸네일을 생성하고 1080x1920, 29~31초인지 확인", async () => {
    const runDir = path.join("data/output", `renderer-test-${Date.now()}`);
    const audioPath = await createMockTtsAudio(runDir, 30);
    const outputPath = path.join(runDir, "video.mp4");
    const renderer = new LocalFfmpegRenderer();
    const mascotPath = await ensureFallbackMascotPng("tests/fixtures/mascot-placeholder.png");

    const result = await renderer.render({
      channelId: "market-detective",
      title: "NVIDIA 이슈 추적",
      hook: "방금 시장에서 포착된 NVIDIA 변동성, 이유는 이것입니다.",
      scenes: [
        { index: 0, startSec: 0, endSec: 3, visualType: "hook", onScreenText: "NVIDIA 변동성 포착" },
        { index: 1, startSec: 3, endSec: 10, visualType: "event_summary", onScreenText: "실적 발표 이후 해석 엇갈림" },
        { index: 2, startSec: 10, endSec: 18, visualType: "key_numbers", onScreenText: "가격 5.2% / 거래량 150%" },
        { index: 3, startSec: 18, endSec: 25, visualType: "risk_note", onScreenText: "원문과 추가 공시 확인" },
        { index: 4, startSec: 25, endSec: 30, visualType: "cta", onScreenText: "공식 링크에서 확인하세요" }
      ],
      subtitles: buildSubtitles("시장탐정이 변동성의 이유를 확인합니다. 가격과 거래량을 함께 봅니다. 투자는 본인 책임입니다."),
      mascotPath,
      audioPath,
      outputPath,
      disclaimer: "본 영상은 투자 참고용이며, 투자 판단은 본인 책임입니다.",
      cta: "더 자세한 자료는 공식 링크에서 확인하세요."
    });

    expect(existsSync(result.videoPath)).toBe(true);
    expect(statSync(result.videoPath).size).toBeGreaterThan(0);
    expect(existsSync(result.thumbnailPath)).toBe(true);

    const { stdout } = await execFileAsync(ffprobe.path, [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration",
      "-of",
      "json",
      result.videoPath
    ]);
    const probe = JSON.parse(stdout) as { streams: Array<{ width: number; height: number }>; format: { duration: string } };
    expect(probe.streams[0].width).toBe(1080);
    expect(probe.streams[0].height).toBe(1920);
    expect(Number(probe.format.duration)).toBeGreaterThanOrEqual(29);
    expect(Number(probe.format.duration)).toBeLessThanOrEqual(31);
  });
});
