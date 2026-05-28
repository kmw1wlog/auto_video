import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export function resolveProjectPath(...parts: string[]): string {
  return path.resolve(process.cwd(), ...parts);
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const body = await readFile(filePath, "utf8");
  return JSON.parse(body) as T;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeTextFile(filePath: string, value: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, value, "utf8");
}

export function pickExistingPath(primary: string, fallback: string): string {
  return existsSync(primary) ? primary : fallback;
}
