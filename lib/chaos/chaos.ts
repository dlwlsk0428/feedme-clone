// 변환기 "최악의 UI 대회" 장치의 규칙. 무작위는 인자로 주입해 테스트에서 고정할 수 있다.

export const MISS_CEILING = 3;
const WIN_RATE = 0.25;

export type LotteryStyle = "roulette" | "note";
export type DrawResult = "win" | "miss";

export function pickLotteryStyle(random: () => number = Math.random): LotteryStyle {
  return random() < 0.5 ? "roulette" : "note";
}

// 연속 꽝이 천장(3회)에 닿으면 무작위와 상관없이 당첨이다.
export function draw(missStreak: number, random: () => number = Math.random): DrawResult {
  if (missStreak >= MISS_CEILING) return "win";
  return random() < WIN_RATE ? "win" : "miss";
}

export const ROBOT_LINES = ["저는 로봇이 아닙니다", "정말요?", "진짜 진짜요?"] as const;
export const ROBOT_CHECKS = ROBOT_LINES.length;

export type Popup = { id: number; generation: number };
export type PopupState = { popups: Popup[]; nextId: number };

const LAST_GENERATION = 3;

export function initialPopups(): PopupState {
  return { popups: [{ id: 1, generation: 1 }], nextId: 2 };
}

// 닫으면 2개가 새로 뜨고, 3세대째부터는 새로 뜨지 않는다(총 1+2+4 = 7번 닫기).
export function closePopup(state: PopupState, id: number): PopupState {
  const closed = state.popups.find((popup) => popup.id === id);
  if (!closed) return state;
  const rest = state.popups.filter((popup) => popup.id !== id);
  if (closed.generation >= LAST_GENERATION) return { ...state, popups: rest };
  const generation = closed.generation + 1;
  return {
    popups: [...rest, { id: state.nextId, generation }, { id: state.nextId + 1, generation }],
    nextId: state.nextId + 2,
  };
}
