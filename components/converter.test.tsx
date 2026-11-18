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

afterEach(() => vi.unstubAllGlobals());

async function convertSample() {
  const user = userEvent.setup();
  render(<Converter />);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await user.click(screen.getByRole("button", { name: "변환하기" }));
  await screen.findByText("Steph Ango · stephango.com · 143 단어");
  return user;
}

test("결과가 없을 때는 내보내기 바가 보이지 않는다", () => {
  render(<Converter />);
  expect(screen.queryByTestId("export-bar")).not.toBeInTheDocument();
});

test("변환하면 제목, 저자, 렌더링된 Markdown과 내보내기 바가 보인다", async () => {
  mockFetch({ ok: true, body: result });
  await convertSample();
  expect(screen.getByText("Use the saw, fear the saw")).toBeInTheDocument();
  expect(screen.getByText("saw", { selector: "strong" })).toBeInTheDocument();
  for (const name of ["복사하기", ".md 다운로드", "ChatGPT로 열기", "Claude로 열기"]) {
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  }
});

test("직접 입력을 고를 때만 텍스트 입력란이 보인다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "직접 입력" }));
  expect(screen.getByLabelText("직접 입력 프롬프트")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "요약해줘" }));
  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
});

test("프리셋은 한 번에 하나만 선택된다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  await user.click(screen.getByRole("button", { name: "요약해줘" }));
  await user.click(screen.getByRole("button", { name: "쉽게 설명해줘" }));
  expect(screen.getByRole("button", { name: "요약해줘" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "쉽게 설명해줘" })).toHaveAttribute("aria-pressed", "true");
});

test("오류가 나면 메시지가 보이고 이전 결과는 남지 않는다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  mockFetch({ ok: false, body: { code: "fetch-failed", message: "페이지를 가져오지 못했습니다(403)." } });
  await user.click(screen.getByRole("button", { name: "변환하기" }));
  await screen.findByText("페이지를 가져오지 못했습니다(403).");
  expect(screen.queryByText("Use the saw, fear the saw")).not.toBeInTheDocument();
  expect(screen.queryByTestId("export-bar")).not.toBeInTheDocument();
});

test("지우기는 입력, 결과, 직접 입력 문구를 모두 비운다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  await user.click(screen.getByRole("button", { name: "직접 입력" }));
  await user.type(screen.getByLabelText("직접 입력 프롬프트"), "메모");
  await user.click(screen.getByRole("button", { name: "지우기" }));
  expect(screen.getByLabelText("변환할 URL")).toHaveValue("");
  expect(screen.queryByTestId("export-bar")).not.toBeInTheDocument();
  mockFetch({ ok: true, body: result });
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await user.click(screen.getByRole("button", { name: "변환하기" }));
  await waitFor(() => screen.getByTestId("export-bar"));
  await user.click(screen.getByRole("button", { name: "직접 입력" }));
  expect(screen.getByLabelText("직접 입력 프롬프트")).toHaveValue("");
});

test("변환 중에는 변환 버튼이 비활성화된다", async () => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  const user = userEvent.setup();
  render(<Converter />);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await user.click(screen.getByRole("button", { name: "변환하기" }));
  expect(screen.getByRole("button", { name: "변환 중…" })).toBeDisabled();
});
