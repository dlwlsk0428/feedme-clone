import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { Converter } from "@/components/converter";

const result = {
  title: "Use the saw, fear the saw",
  author: "Steph Ango",
  site: "stephango.com",
  wordCount: 143,
  markdown: "# Use the saw\n\nFear the **saw**.",
};

function mockFetch(response: { ok: boolean; body: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: response.ok, json: async () => response.body })));
}

function stubClipboard() {
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("dark");
});

async function convertSample() {
  const user = userEvent.setup();
  render(<Converter />);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await user.click(screen.getByText("변환"));
  await screen.findByText("Use the saw, fear the saw", { selector: "b" });
  return user;
}

test("안내 문단은 변환 전에도 항상 보이고, 슬라이드 번호는 없다", () => {
  render(<Converter />);
  for (const word of ["변환", "복사", "다운로드", "요약", "번역", "쉬운 설명", "직접 입력", "ChatGPT", "Claude", "처음으로 돌아가기"]) {
    expect(screen.getByText(word)).toBeInTheDocument();
  }
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/\d+\s*\/\s*\d+/);
});

test("변환하면 제목, 글쓴이, 렌더링된 Markdown이 보인다", async () => {
  mockFetch({ ok: true, body: result });
  await convertSample();
  expect(screen.getByText("Steph Ango")).toBeInTheDocument();
  expect(screen.getByText("saw", { selector: "strong" })).toBeInTheDocument();
});

test("입력란에서 Enter를 눌러도 변환되지 않는다", async () => {
  mockFetch({ ok: true, body: result });
  const user = userEvent.setup();
  render(<Converter />);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw{Enter}");
  expect(fetch).not.toHaveBeenCalled();
});

test("변환 중에는 탭 제목만 ...이 되고 끝나면 돌아온다", async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise((r) => (resolve = r))));
  document.title = "원래 제목";
  const user = userEvent.setup();
  render(<Converter />);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await user.click(screen.getByText("변환"));
  expect(document.title).toBe("...");
  resolve({ ok: true, json: async () => result });
  await screen.findByText("Use the saw, fear the saw", { selector: "b" });
  expect(document.title).toBe("원래 제목");
});

test("복사는 더블클릭해야 Markdown 원문이 클립보드에 들어간다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  const writeText = stubClipboard();
  await user.click(screen.getByText("복사"));
  expect(writeText).not.toHaveBeenCalled();
  await user.dblClick(screen.getByText("복사"));
  expect(writeText).toHaveBeenCalledWith(result.markdown);
});

test("클립보드 쓰기가 거부돼도 오류 없이 조용히 넘어간다", async () => {
  mockFetch({ ok: true, body: result });
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) },
    configurable: true,
  });
  const user = await convertSample();
  await user.dblClick(screen.getByText("복사"));
  expect(screen.getByText("복사")).toBeInTheDocument();
});

test("프롬프트는 하나만 선택되고, 직접 입력을 고를 때만 빈칸이 나타난다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
  await user.click(screen.getByText("직접 입력"));
  expect(screen.getByLabelText("직접 입력 프롬프트")).toBeInTheDocument();
  await user.click(screen.getByText("요약"));
  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
});

test("ChatGPT는 한 번, Claude는 두 번 클릭해야 열리고 프롬프트가 앞에 붙는다", async () => {
  mockFetch({ ok: true, body: result });
  const open = vi.fn();
  vi.stubGlobal("open", open);
  const user = await convertSample();
  await user.click(screen.getByText("요약"));
  await user.click(screen.getByText("Claude"));
  expect(open).not.toHaveBeenCalled();
  await user.dblClick(screen.getByText("Claude"));
  expect(open).toHaveBeenCalledTimes(1);
  expect(open.mock.calls[0][0]).toBe(
    `https://claude.ai/new?q=${encodeURIComponent(`요약해줘\n\n${result.markdown}`)}`,
  );
  await user.click(screen.getByText("ChatGPT"));
  expect(open).toHaveBeenCalledTimes(2);
  expect(open.mock.calls[1][0]).toContain("https://chatgpt.com/?q=");
});

test("긴 글은 전체를 클립보드에 복사하고 새 대화만 연다", async () => {
  const markdown = "가나다 ".repeat(1500);
  mockFetch({ ok: true, body: { ...result, markdown } });
  const open = vi.fn();
  vi.stubGlobal("open", open);
  const user = await convertSample();
  const writeText = stubClipboard();
  await user.click(screen.getByText("ChatGPT"));
  expect(open.mock.calls[0][0]).toBe("https://chatgpt.com/");
  expect(writeText).toHaveBeenCalledWith(markdown);
  expect(screen.getByText("길어서 이미 복사됨(아마)")).toBeInTheDocument();
});

test("오류가 나면 짧은 문구가 보이고 이전 결과는 남지 않는다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  mockFetch({ ok: false, body: { code: "fetch-failed", message: "페이지를 가져오지 못했습니다(403)." } });
  await user.click(screen.getByText("변환"));
  await screen.findByText("페이지를 가져오지 못했습니다(403).");
  expect(screen.queryByText("Use the saw, fear the saw", { selector: "b" })).not.toBeInTheDocument();
});

test("처음으로 돌아가기는 입력, 결과, 프롬프트 선택, 직접 입력 문구를 모두 비운다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  await user.click(screen.getByText("직접 입력"));
  await user.type(screen.getByLabelText("직접 입력 프롬프트"), "메모");
  await user.click(screen.getByText("처음으로 돌아가기"));
  expect(screen.getByLabelText("변환할 URL")).toHaveValue("");
  expect(screen.queryByText("Use the saw, fear the saw", { selector: "b" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
  await user.click(screen.getByText("직접 입력"));
  expect(screen.getByLabelText("직접 입력 프롬프트")).toHaveValue("");
});

test("보노보노의 눈을 누르면 다크모드가 전환된다", async () => {
  const user = userEvent.setup();
  render(<Converter />);
  await user.click(screen.getByTestId("eyes"));
  expect(document.documentElement).toHaveClass("dark");
  await user.click(screen.getByTestId("eyes"));
  expect(document.documentElement).not.toHaveClass("dark");
});

test("NEW!!를 누르면 광고 모드가 되고 미친 스티커로 돌아오며, 광고 모드에서도 변환된다", async () => {
  mockFetch({ ok: true, body: result });
  const user = userEvent.setup();
  render(<Converter />);
  await user.click(screen.getByText("NEW!!"));
  expect(screen.getByText("위독하실 분")).toBeInTheDocument();
  expect(screen.getByText("급구")).toBeInTheDocument();
  expect(screen.getByText("지금 변환하세요")).toBeInTheDocument();
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await user.click(screen.getByText("변환"));
  await waitFor(() => screen.getByText("Use the saw, fear the saw", { selector: "b" }));
  await user.click(screen.getByText("미친"));
  expect(screen.getByText("URL을 마크다운으로")).toBeInTheDocument();
});
