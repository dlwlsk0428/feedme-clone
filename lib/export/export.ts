export const LLM_TARGETS = {
  chatgpt: { label: "ChatGPT", base: "https://chatgpt.com/?q=" },
  claude: { label: "Claude", base: "https://claude.ai/new?q=" },
} as const;

export type LlmTarget = keyof typeof LLM_TARGETS;

// URL로 안전하게 실을 수 있는 인코딩 후 길이의 보수적 상한.
export const MAX_QUERY_LENGTH = 8000;

export function composePayload(prompt: string, markdown: string): string {
  const trimmed = prompt.trim();
  return trimmed ? `${trimmed}\n\n${markdown}` : markdown;
}

export type LlmLaunch =
  | { mode: "query"; url: string }
  | { mode: "clipboard"; url: string; text: string };

export function planLlmLaunch(target: LlmTarget, text: string): LlmLaunch {
  const { base } = LLM_TARGETS[target];
  const encoded = encodeURIComponent(text);
  if (encoded.length <= MAX_QUERY_LENGTH) {
    return { mode: "query", url: base + encoded };
  }
  return { mode: "clipboard", url: base.split("?")[0], text };
}

export function markdownFileName(title: string): string {
  const slug = title
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "page"}.md`;
}
