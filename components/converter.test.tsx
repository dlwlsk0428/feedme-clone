import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { randomConfirmLayout } from "@/components/chaos-devices";
import { Converter } from "@/components/converter";

const result = {
  title: "Use the saw, fear the saw",
  author: "Steph Ango",
  site: "stephango.com",
  wordCount: 143,
  markdown: "# Use the saw\n\nFear the **saw**.",
};

type User = ReturnType<typeof userEvent.setup>;

function mockFetch(response: { ok: boolean; body: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: response.ok, json: async () => response.body })));
}

function stubClipboard() {
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

// 기본은 무작위 0: 룰렛이 나오고 첫 뽑기에서 바로 당첨된다. 개별 테스트가 다시 고정할 수 있다.
beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("dark");
});

const robotCheck = () => within(screen.getByTestId("robot-check")).getByText(/^☐/);

async function passRobotCheck(user: User) {
  for (let i = 0; i < 3; i++) await user.click(robotCheck());
}

// 뽑기(룰렛 당첨) → 로봇 확인 3번 → 확인창 [예]까지 통과한다.
async function passGates(user: User, answer = "[예]") {
  await user.click(screen.getByText("변환"));
  await user.click(await screen.findByText("돌리기"));
  await passRobotCheck(user);
  await user.click(screen.getByText(answer));
}

async function convertSample() {
  const user = userEvent.setup();
  render(<Converter />);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await passGates(user);
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
  expect(screen.queryByTestId("lottery")).not.toBeInTheDocument();
});

test("변환 중에는 탭 제목만 ...이 되고 99% 진행률 바가 보이며, 끝나면 모두 돌아온다", async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise((r) => (resolve = r))));
  document.title = "원래 제목";
  const user = userEvent.setup();
  render(<Converter />);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await passGates(user);
  expect(document.title).toBe("...");
  expect(screen.getByTestId("progress")).toHaveTextContent("99%");
  resolve({ ok: true, json: async () => result });
  await screen.findByText("Use the saw, fear the saw", { selector: "b" });
  expect(document.title).toBe("원래 제목");
  expect(screen.queryByTestId("progress")).not.toBeInTheDocument();
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

test("오류가 나면 짧은 문구가 보이고 이전 결과와 진행률 바는 남지 않는다", async () => {
  mockFetch({ ok: true, body: result });
  const user = await convertSample();
  mockFetch({ ok: false, body: { code: "fetch-failed", message: "페이지를 가져오지 못했습니다(403)." } });
  await passGates(user);
  await screen.findByText("페이지를 가져오지 못했습니다(403).");
  expect(screen.queryByText("Use the saw, fear the saw", { selector: "b" })).not.toBeInTheDocument();
  expect(screen.queryByTestId("progress")).not.toBeInTheDocument();
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
  await passGates(user);
  await waitFor(() => screen.getByText("Use the saw, fear the saw", { selector: "b" }));
  await user.click(screen.getByText("미친"));
  expect(screen.getByText("URL을 마크다운으로")).toBeInTheDocument();
});

test("변환을 누르면 뽑기가 나오고 룰렛과 쪽지가 모두 나올 수 있다", async () => {
  const user = userEvent.setup();
  const first = render(<Converter />);
  await user.click(screen.getByText("변환"));
  expect(screen.getByTestId("lottery")).toHaveAttribute("data-style", "roulette");
  first.unmount();
  vi.mocked(Math.random).mockReturnValue(0.99);
  render(<Converter />);
  await user.click(screen.getByText("변환"));
  expect(screen.getByTestId("lottery")).toHaveAttribute("data-style", "note");
});

test("연속 3번 꽝이면 4번째 뽑기는 반드시 당첨이고, 처음으로 돌아가기가 꽝 횟수를 초기화한다", async () => {
  vi.mocked(Math.random).mockReturnValue(0.99);
  const user = userEvent.setup();
  render(<Converter />);
  await user.click(screen.getByText("변환"));
  for (let i = 0; i < 3; i++) {
    await user.click(screen.getAllByTestId("note")[0]);
    expect(screen.getByTestId("lottery")).toBeInTheDocument();
    expect(screen.queryByTestId("robot-check")).not.toBeInTheDocument();
  }
  expect(screen.getByTestId("lottery")).toHaveTextContent("연속 꽝 3번");
  await user.click(screen.getAllByTestId("note")[0]);
  expect(screen.getByTestId("robot-check")).toBeInTheDocument();

  await user.click(screen.getByText("처음으로 돌아가기"));
  await user.click(screen.getByText("변환"));
  await user.click(screen.getAllByTestId("note")[0]);
  expect(screen.getByTestId("lottery")).toHaveTextContent("연속 꽝 1번");
});

test("로봇 확인은 3번 눌러야 통과하고 누를 때마다 문구가 바뀐다", async () => {
  const user = userEvent.setup();
  render(<Converter />);
  await user.click(screen.getByText("변환"));
  await user.click(screen.getByText("돌리기"));
  const seen = [robotCheck().textContent];
  await user.click(robotCheck());
  seen.push(robotCheck().textContent);
  await user.click(robotCheck());
  seen.push(robotCheck().textContent);
  expect(new Set(seen).size).toBe(3);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(robotCheck());
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("확인창은 [아니오]를 눌러도 변환이 시작된다", async () => {
  mockFetch({ ok: true, body: result });
  const user = userEvent.setup();
  render(<Converter />);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await passGates(user, "[아니오]");
  await screen.findByText("Use the saw, fear the saw", { selector: "b" });
});

test("확인창의 [예]/[아니오] 위치는 무작위에 따라 달라진다", () => {
  expect(randomConfirmLayout(() => 0.1)).not.toEqual(randomConfirmLayout(() => 0.9));
});

test("쿠키 배너의 [모두 거부]는 4번 피한 뒤 눌러지고, [모두 수락]은 바로 닫힌다", async () => {
  const user = userEvent.setup();
  const first = render(<Converter />);
  const reject = screen.getByText("[모두 거부]");
  for (let i = 0; i < 4; i++) {
    await user.unhover(reject);
    await user.hover(reject);
  }
  expect(screen.getByTestId("cookie-banner")).toBeInTheDocument();
  await user.click(reject);
  expect(screen.queryByTestId("cookie-banner")).not.toBeInTheDocument();
  first.unmount();

  render(<Converter />);
  await user.click(screen.getByText("[모두 수락]"));
  expect(screen.queryByTestId("cookie-banner")).not.toBeInTheDocument();
});

test("광고 팝업은 닫을 때마다 2개가 뜨고 총 7번 닫으면 모두 사라지며, 떠 있어도 변환 흐름을 쓸 수 있다", async () => {
  const user = userEvent.setup();
  render(<Converter />);
  expect(screen.getAllByTestId("ad-popup")).toHaveLength(1);
  await user.click(screen.getByTestId("ad-close"));
  expect(screen.getAllByTestId("ad-popup")).toHaveLength(2);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  await user.click(screen.getByText("변환"));
  expect(screen.getByTestId("lottery")).toBeInTheDocument();
  for (let i = 0; i < 6; i++) await user.click(screen.getAllByTestId("ad-close")[0]);
  expect(screen.queryAllByTestId("ad-popup")).toHaveLength(0);
});

test("이탈 방지는 URL이 있을 때만 걸린다", async () => {
  const user = userEvent.setup();
  render(<Converter />);
  const leave = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };
  expect(leave()).toBe(false);
  await user.type(screen.getByLabelText("변환할 URL"), "https://stephango.com/saw");
  expect(leave()).toBe(true);
  await user.click(screen.getByText("처음으로 돌아가기"));
  expect(leave()).toBe(false);
});
