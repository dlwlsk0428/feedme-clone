import { expect, test } from "vitest";

import {
  composePayload,
  markdownFileName,
  MAX_QUERY_LENGTH,
  planLlmLaunch,
} from "@/lib/export/export";

test("프롬프트가 있으면 프롬프트, 빈 줄, 본문 순서로 합친다", () => {
  expect(composePayload("요약해줘", "# 본문")).toBe("요약해줘\n\n# 본문");
});

test("프롬프트가 비어 있거나 공백뿐이면 본문만 넘긴다", () => {
  expect(composePayload("", "# 본문")).toBe("# 본문");
  expect(composePayload("   ", "# 본문")).toBe("# 본문");
});

test("짧은 텍스트는 ChatGPT와 Claude의 쿼리 URL로 넘긴다", () => {
  const gpt = planLlmLaunch("chatgpt", "a b");
  expect(gpt).toEqual({ mode: "query", url: "https://chatgpt.com/?q=a%20b" });
  const claude = planLlmLaunch("claude", "a b");
  expect(claude).toEqual({ mode: "query", url: "https://claude.ai/new?q=a%20b" });
});

test("한도를 넘는 텍스트는 새 대화만 열고 클립보드로 넘긴다", () => {
  const text = "가".repeat(MAX_QUERY_LENGTH);
  const launch = planLlmLaunch("claude", text);
  expect(launch).toEqual({ mode: "clipboard", url: "https://claude.ai/new", text });
});

test("파일명은 제목에서 만들고 한글을 유지한다", () => {
  expect(markdownFileName("Use the saw, fear the saw")).toBe("Use-the-saw-fear-the-saw.md");
  expect(markdownFileName("마크다운 - 위키백과")).toBe("마크다운-위키백과.md");
  expect(markdownFileName("???")).toBe("page.md");
});
