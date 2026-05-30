import { readFile } from "node:fs/promises";

export type ContentCsvRow = {
  id: string;
  target: string;
  keyword: string;
  form: string;
  voice: string;
  status: string;
  imageUrl: string;
  ratio: string;
  voiceId: string;
  title: string;
  description: string;
  script: string;
  tags: string[];
  videoUrl: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"') {
      value += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
      continue;
    }
    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

export class ContentCsvProvider {
  constructor(private readonly csvPath: string) {}

  async fetch(): Promise<ContentCsvRow[]> {
    const text = await readFile(this.csvPath, "utf8");
    const [headers = [], ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
    const headerMap = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
    const get = (row: string[], key: string): string => row[headerMap.get(key) ?? -1]?.trim() ?? "";

    return rows.map((row) => ({
      id: get(row, "id"),
      target: get(row, "target"),
      keyword: get(row, "keyword"),
      form: get(row, "form"),
      voice: get(row, "voice"),
      status: get(row, "status"),
      imageUrl: get(row, "img_url"),
      ratio: get(row, "ratio"),
      voiceId: get(row, "voice_id"),
      title: get(row, "title"),
      description: get(row, "description"),
      script: get(row, "script"),
      tags: get(row, "tags").split(",").map((tag) => tag.trim()).filter(Boolean),
      videoUrl: get(row, "video_url")
    }));
  }
}

export function selectNextContentRow(rows: ContentCsvRow[], preferredId = process.env.CONTENT_ROW_ID): ContentCsvRow {
  const byId = preferredId ? rows.find((row) => row.id === preferredId) : undefined;
  const selected =
    byId ??
    rows.find((row) => row.form.includes("쇼츠") && row.ratio === "9:16" && row.status !== "배포") ??
    rows.find((row) => row.form.includes("쇼츠") && row.ratio === "9:16");

  if (!selected) {
    throw new Error("CSV에서 9:16 쇼츠 행을 찾지 못했습니다.");
  }
  if (!selected.script || !selected.title) {
    throw new Error(`CSV 행 ${selected.id}에 title/script가 필요합니다.`);
  }
  return selected;
}
