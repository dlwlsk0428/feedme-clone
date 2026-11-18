import { expect, test } from "vitest";

import { closePopup, draw, initialPopups, MISS_CEILING, pickLotteryStyle, ROBOT_LINES } from "@/lib/chaos/chaos";

test("운이 나빠도 연속 꽝이 3번이면 4번째는 반드시 당첨이다", () => {
  const alwaysMiss = () => 0.999;
  expect(draw(0, alwaysMiss)).toBe("miss");
  expect(draw(1, alwaysMiss)).toBe("miss");
  expect(draw(2, alwaysMiss)).toBe("miss");
  expect(draw(MISS_CEILING, alwaysMiss)).toBe("win");
});

test("운이 좋으면 천장 전에도 당첨된다", () => {
  expect(draw(0, () => 0)).toBe("win");
});

test("뽑기 방식은 룰렛과 쪽지 두 가지가 모두 나온다", () => {
  expect(pickLotteryStyle(() => 0)).toBe("roulette");
  expect(pickLotteryStyle(() => 0.99)).toBe("note");
});

test("광고 팝업은 1개로 시작하고 닫을 때마다 2개가 뜨다가 3세대째부터 멈춘다", () => {
  let state = initialPopups();
  let closes = 0;
  expect(state.popups).toHaveLength(1);
  while (state.popups.length > 0) {
    state = closePopup(state, state.popups[0].id);
    closes++;
    expect(closes).toBeLessThan(50);
  }
  expect(closes).toBe(7);
});

test("첫 광고를 닫으면 2세대 2개가 뜬다", () => {
  const next = closePopup(initialPopups(), 1);
  expect(next.popups.map((popup) => popup.generation)).toEqual([2, 2]);
});

test("로봇 확인 문구는 3번의 클릭마다 서로 다르다", () => {
  expect(new Set(ROBOT_LINES).size).toBe(ROBOT_LINES.length);
  expect(ROBOT_LINES.length).toBeGreaterThanOrEqual(3);
});
