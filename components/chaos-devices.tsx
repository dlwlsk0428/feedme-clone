"use client";

import { useState } from "react";

import {
  closePopup,
  initialPopups,
  ROBOT_CHECKS,
  ROBOT_LINES,
  type LotteryStyle,
} from "@/lib/chaos/chaos";

// 뽑기: 룰렛은 "돌리기"를, 쪽지는 쪽지 하나를 한 번 클릭하면 결과가 나온다.
export function Lottery({
  style,
  missStreak,
  onDraw,
}: {
  style: LotteryStyle;
  missStreak: number;
  onDraw: () => void;
}) {
  const [spins, setSpins] = useState(0);
  const draw = () => {
    setSpins((value) => value + 1);
    onDraw();
  };
  return (
    <div className="chaos-panel" data-testid="lottery" data-style={style}>
      <p className="prose">
        {style === "roulette"
          ? "룰렛이 나왔습니다. 돌리기를 한 번 클릭하면 룰렛이 돌고 결과가 나옵니다."
          : "복불복 쪽지가 나왔습니다. 아래 쪽지 중 아무거나 한 번 클릭해서 펼쳐 보세요."}{" "}
        꽝이면 같은 방식으로 다시 뽑고, 연속 3번 꽝이면 4번째는 반드시 당첨입니다.
        {missStreak > 0 && ` (지금까지 연속 꽝 ${missStreak}번)`}
      </p>
      {style === "roulette" ? (
        <div>
          <div className="wheel" style={{ transform: `rotate(${spins * 740}deg)` }}>
            {["꽝", "당첨?", "꽝", "꽝?", "꽝", "당첨!"].map((label, index) => (
              <span key={index} style={{ transform: `rotate(${index * 60}deg) translateY(-44px)` }}>
                {label}
              </span>
            ))}
          </div>
          <span className="ac" onClick={draw}>
            돌리기
          </span>
        </div>
      ) : (
        <div className="notes">
          {["🎫", "🎫", "🎫", "🎫", "🎫"].map((note, index) => (
            <span key={index} className="ac note" data-testid="note" onClick={draw}>
              {note}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 가짜 로봇 확인: 3번 누르면 통과하고, 누를 때마다 문구가 바뀐다.
export function RobotCheck({ onPass }: { onPass: () => void }) {
  const [count, setCount] = useState(0);
  const click = () => {
    if (count + 1 >= ROBOT_CHECKS) onPass();
    else setCount(count + 1);
  };
  return (
    <div className="chaos-panel" data-testid="robot-check">
      <p className="prose">
        이번엔 로봇 확인입니다. 아래 체크를 3번 클릭하면 통과하고, 누를 때마다 문구가 바뀝니다.
      </p>
      <span className="ac" onClick={click}>
        ☐ {ROBOT_LINES[count]}
      </span>
    </div>
  );
}

// 변환 확인창: [예]/[아니오]의 위치는 열릴 때마다 바뀌고, 어느 쪽을 눌러도 변환이 진행된다.
export type ConfirmLayout = { yes: [number, number]; no: [number, number] };

export function randomConfirmLayout(random: () => number = Math.random): ConfirmLayout {
  const spot = (): [number, number] => [Math.round(random() * 300), Math.round(random() * 60)];
  return { yes: spot(), no: spot() };
}

export function ConfirmDialog({ layout, onAnswer }: { layout: ConfirmLayout; onAnswer: () => void }) {
  return (
    <div className="chaos-panel" role="dialog" aria-label="변환 확인">
      <p className="prose">
        정말 변환하시겠습니까? [예]와 [아니오]는 열릴 때마다 자리가 바뀌지만, 어느 쪽을 한 번 클릭해도 변환이 시작됩니다.
      </p>
      <div className="confirm-area">
        <span className="ac" style={{ left: layout.yes[0], top: layout.yes[1] }} onClick={onAnswer}>
          [예]
        </span>
        <span className="ac" style={{ left: layout.no[0], top: layout.no[1] }} onClick={onAnswer}>
          [아니오]
        </span>
      </div>
    </div>
  );
}

// 99%에서 멈춰 있는 진행률 바. 변환이 끝나면 부모가 렌더링을 멈춘다.
export function FakeProgress() {
  return (
    <div className="progress" data-testid="progress">
      <div className="bar" style={{ width: "99%" }} />
      <span>99%</span>
    </div>
  );
}

// 도망가는 쿠키 배너: [모두 수락]은 바로 닫히고, [모두 거부]는 4번 피한 뒤 눌러진다.
const DODGES = 4;
const DODGE_SPOTS: [number, number][] = [
  [380, 0],
  [20, 40],
  [220, 36],
  [430, 34],
];

export function CookieBanner({ onClose }: { onClose: () => void }) {
  const [dodges, setDodges] = useState(0);
  const dodge = () => setDodges((value) => Math.min(value + 1, DODGES));
  const reject = () => {
    if (dodges < DODGES) dodge();
    else onClose();
  };
  const [x, y] = dodges === 0 ? [0, 0] : DODGE_SPOTS[dodges - 1];
  return (
    <div className="cookie" data-testid="cookie-banner">
      <p>
        쿠키를 쓰는 척합니다. [모두 수락]은 한 번 클릭하면 바로 닫힙니다. [모두 거부]는 커서를 피해 도망가고, 4번 피하면 멈춰서 눌러집니다.
      </p>
      <div className="cookie-buttons">
        <span className="ac" onClick={onClose}>
          [모두 수락]
        </span>
        <span
          className="ac reject"
          style={{ transform: `translate(${x}px, ${y}px)` }}
          onMouseEnter={() => dodges < DODGES && dodge()}
          onClick={reject}
        >
          [모두 거부]
        </span>
      </div>
    </div>
  );
}

// 번식하는 광고 팝업: 모달이 아니라서 떠 있어도 뒤의 화면을 쓸 수 있다.
export function AdPopups() {
  const [state, setState] = useState(initialPopups);
  return (
    <>
      {state.popups.map((popup) => (
        <div
          key={popup.id}
          className="ad-popup"
          data-testid="ad-popup"
          style={{ left: 30 + ((popup.id * 137) % 520), top: 150 + ((popup.id * 89) % 330) }}
        >
          <span className="x" data-testid="ad-close" onClick={() => setState((value) => closePopup(value, popup.id))}>
            ×
          </span>
          <p>
            🎉 축하합니다, {popup.generation}세대 광고입니다! 작은 ×를 한 번 클릭하면 닫히지만 2개가 새로 뜹니다. 3세대째(총 7번 닫기)부터는 닫아도 새로 뜨지 않습니다.
          </p>
        </div>
      ))}
    </>
  );
}
