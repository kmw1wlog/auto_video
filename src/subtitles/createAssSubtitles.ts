import type { ReelStoryboard } from "../storyboard/types.js";

function formatAssTime(seconds: number): string {
  const cs = Math.round(seconds * 100);
  const hours = Math.floor(cs / 360000);
  const minutes = Math.floor((cs % 360000) / 6000);
  const secs = Math.floor((cs % 6000) / 100);
  const centis = cs % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function escapeAssText(text: string): string {
  return text.replace(/[{}]/g, "").replace(/\n/g, "\\N");
}

export function createAssSubtitles(storyboard: ReelStoryboard): string {
  const dialogue = storyboard.subtitles
    .map((line) => `Dialogue: 0,${formatAssTime(line.startSec)},${formatAssTime(line.endSec)},Subtitle,,0,0,0,,${escapeAssText(line.text)}`)
    .join("\n");

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Subtitle,Arial,74,&H00FFFFFF,&H000000FF,&H00111111,&HAA000000,1,0,0,0,100,100,0,0,1,5,1,2,80,80,230,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogue}
`;
}
