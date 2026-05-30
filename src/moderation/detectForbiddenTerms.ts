import { FORBIDDEN_WORDS } from "./forbiddenWords.js";

export function detectForbiddenTerms(text: string): string[] {
  return FORBIDDEN_WORDS.filter((term) => text.includes(term));
}
