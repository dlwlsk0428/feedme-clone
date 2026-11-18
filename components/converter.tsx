"use client";

import { useEffect, useRef, useState } from "react";

import "@/components/bonobono.css";
import {
  AdPopups,
  ConfirmDialog,
  CookieBanner,
  FakeProgress,
  Lottery,
  randomConfirmLayout,
  RobotCheck,
  type ConfirmLayout,
} from "@/components/chaos-devices";
import { MarkdownView } from "@/components/markdown-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { draw, pickLotteryStyle, type LotteryStyle } from "@/lib/chaos/chaos";
import {
  composePayload,
  markdownFileName,
  planLlmLaunch,
  type LlmTarget,
} from "@/lib/export/export";

type Result = {
  title: string;
  author: string;
  site: string;
  wordCount: number;
  markdown: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: Result };

// 변환을 누른 뒤 거치는 관문. idle이면 아무 관문도 열려 있지 않다.
type Step =
  | { kind: "idle" }
  | { kind: "lottery"; style: LotteryStyle }
  | { kind: "robot" }
  | { kind: "confirm"; layout: ConfirmLayout };

const PRESETS = [
  { label: "요약", prompt: "요약해줘" },
  { label: "번역", prompt: "한국어로 번역해줘" },
  { label: "쉬운 설명", prompt: "쉽게 설명해줘" },
] as const;
const CUSTOM = "__custom";

const NORMAL = { t1: "URL을 마크다운으로", t2: "하는 방법", t3: "(아마도)*^^*", plea: "구독과 좋아요해줄거지?", sticker: "NEW!!" };
const AD = { t1: "위독하실 분", t2: "급구", t3: "URL변환전문대기업 [주]보노보노주식회사", plea: "지금 변환하세요", sticker: "미친" };

export function Converter() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preset, setPreset] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [clipboardNote, setClipboardNote] = useState(false);
  const [ad, setAd] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [missStreak, setMissStreak] = useState(0);
  const [cookieOpen, setCookieOpen] = useState(true);
  const requestId = useRef(0);

  const loading = status.kind === "loading";
  const result = status.kind === "done" ? status.result : null;
  const prompt = preset === CUSTOM ? custom : (preset ?? "");
  const text = ad ? AD : NORMAL;

  // 변환 중의 유일한 피드백은 탭 제목이다.
  useEffect(() => {
    if (!loading) return;
    const original = document.title;
    document.title = "...";
    return () => {
      document.title = original;
    };
  }, [loading]);

  // 저장하지 않은 입력이나 결과가 있으면 탭을 닫거나 새로고침할 때 브라우저 확인창을 띄운다.
  const dirty = url.trim() !== "" || result !== null;
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  function startConvert() {
    if (loading || step.kind !== "idle") return;
    setStep({ kind: "lottery", style: pickLotteryStyle() });
  }

  function drawLottery() {
    if (draw(missStreak) === "win") {
      setMissStreak(0);
      setStep({ kind: "robot" });
    } else {
      setMissStreak(missStreak + 1);
    }
  }

  function answerConfirm() {
    setStep({ kind: "idle" });
    void convert();
  }

  async function convert() {
    if (loading) return;
    const id = ++requestId.current;
    setStatus({ kind: "loading" });
    setClipboardNote(false);
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (id !== requestId.current) return;
      setStatus(
        response.ok
          ? { kind: "done", result: data }
          : { kind: "error", message: data.message ?? "변환에 실패했습니다." },
      );
    } catch {
      if (id !== requestId.current) return;
      setStatus({ kind: "error", message: "서버에 연결하지 못했습니다." });
    }
  }

  function clear() {
    requestId.current++;
    setStep({ kind: "idle" });
    setMissStreak(0);
    setUrl("");
    setStatus({ kind: "idle" });
    setPreset(null);
    setCustom("");
    setClipboardNote(false);
  }

  function writeClipboard(value: string) {
    navigator.clipboard?.writeText(value).catch(() => {});
  }

  function copy() {
    if (result) writeClipboard(result.markdown);
  }

  function download() {
    if (!result) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([result.markdown], { type: "text/markdown" }));
    link.download = markdownFileName(result.title);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function openLlm(target: LlmTarget) {
    if (!result) return;
    const launch = planLlmLaunch(target, composePayload(prompt, result.markdown));
    window.open(launch.url, "_blank", "noopener");
    if (launch.mode === "clipboard") writeClipboard(launch.text);
    setClipboardNote(launch.mode === "clipboard");
  }

  const meta = result
    ? [result.site !== result.author ? result.site : "", result.wordCount ? `${result.wordCount.toLocaleString()}단어` : ""]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="ppt">
      <div className="menubar">
        {["파일", "편집", "보기", "삽입", "서식", "도구", "슬라이드 쇼", "도움말(없음)"].map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      {cookieOpen && <CookieBanner onClose={() => setCookieOpen(false)} />}
      <AdPopups />
      <div className={`slide${ad ? " ad" : ""}`}>
        <div className="clip">
          <div className="pic">
            {/* eslint-disable-next-line @next/next/no-img-element -- 투명 PNG를 그대로 쓴다 */}
            <img src="/bonobono.png" alt="보노보노" />
            <ThemeToggle />
          </div>
          <div className="eye-hint">보노보노 (그림 직접 그림)</div>
          <span className="deco">🌀</span>
          <div className="new" onClick={() => setAd((value) => !value)}>
            {text.sticker}
          </div>
        </div>

        <div className="t1 wordart">{text.t1}</div>
        <div className="t2 wordart">{text.t2}</div>
        <div className="t3">{text.t3}</div>
        <div className="sub">PRESENTED BY 아무튼 서비스 ver 0.3 (beta?)</div>

        <p className="prose">
          읽고 싶은 웹 페이지의 주소를{" "}
          <input
            className="blank"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-label="변환할 URL"
            spellCheck={false}
            autoComplete="off"
          />{" "}
          이 빈칸에 붙여넣으세요. 붙여넣었으면{" "}
          <span className="ac" onClick={startConvert}>
            변환
          </span>
          을 한 번 클릭하세요. 그러면 뽑기, 로봇 확인, 변환 확인창을 차례로 거친 뒤 페이지 본문이 마크다운으로 바뀌어 아래에 나타납니다. 처리하는 동안에는 99%에서 멈춰 있는 진행률 바가 보이지만 끝나면 사라지니 2초쯤 기다리면 됩니다.
        </p>

        {step.kind === "lottery" && <Lottery key={step.style} style={step.style} missStreak={missStreak} onDraw={drawLottery} />}
        {step.kind === "robot" && <RobotCheck onPass={() => setStep({ kind: "confirm", layout: randomConfirmLayout() })} />}
        {step.kind === "confirm" && <ConfirmDialog layout={step.layout} onAnswer={answerConfirm} />}
        {loading && <FakeProgress />}

        {status.kind === "error" && (
          <p className="prose">
            <span className="tiny">{status.message}</span>
          </p>
        )}

        {result && (
          <div className="result">
            <p className="prose">
              변환된 글의 제목은 <b>{result.title}</b>이고 글쓴이는 <span>{result.author || "알 수 없음"}</span>입니다.{" "}
              <span className="tiny">({meta})</span> 아래 상자가 마크다운으로 바뀐 본문입니다.
            </p>
            <MarkdownView>{result.markdown}</MarkdownView>
          </div>
        )}

        <p className="prose">
          본문을 클립보드에 복사하려면{" "}
          <span className="ac" onDoubleClick={copy}>
            복사
          </span>
          를 두 번 연속 클릭하세요. 복사됐다는 알림은 나오지 않습니다. .md 파일로 저장하려면{" "}
          <span className="ac" onClick={download}>
            다운로드
          </span>
          를 한 번 클릭하세요. ChatGPT나 Claude에게 본문과 함께 시킬 일이 있다면 먼저{" "}
          {PRESETS.map((item) => (
            <span key={item.prompt}>
              <span className="ac" onClick={() => setPreset(item.prompt)}>
                {item.label}
              </span>
              {item.label === "쉬운 설명" ? " 중 하나를 클릭하세요. " : ", "}
            </span>
          ))}
          고르면 표시는 없지만 선택된 것이고, 다른 것을 클릭하면 바뀝니다. 직접 쓰고 싶으면{" "}
          <span className="ac" onClick={() => setPreset(CUSTOM)}>
            직접 입력
          </span>
          을 클릭하고 나타나는 빈칸{" "}
          {preset === CUSTOM && (
            <input
              className="blank"
              style={{ width: "10em" }}
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              aria-label="직접 입력 프롬프트"
              spellCheck={false}
              autoComplete="off"
            />
          )}{" "}
          에 쓰세요. 쓴 내용은 이번 한 번만 쓰이고 저장되지 않습니다. 마지막으로{" "}
          <span className="ac" onClick={() => openLlm("chatgpt")}>
            ChatGPT
          </span>
          를 한 번 클릭하거나{" "}
          <span className="ac" onDoubleClick={() => openLlm("claude")}>
            Claude
          </span>
          를 두 번 클릭하면 새 대화가 열리고 본문이 넘어갑니다. 글이 너무 길면 클립보드로 대신 복사되니 새 대화에 붙여넣기(Ctrl+V)하세요.
        </p>
        {clipboardNote && <span className="tiny">길어서 이미 복사됨(아마)</span>}

        <p className="prose" style={{ marginTop: 18 }}>
          처음부터 다시 하고 싶은 분은{" "}
          <span className="ac" onClick={clear}>
            처음으로 돌아가기
          </span>
          를 클릭하세요. 입력한 주소와 직접 쓴 내용이 모두 지워집니다. 눈이 아프신 분은 보노보노의 눈을 보시면 됩니다.
        </p>

        <span className="fish">🐟</span>
        <div className="plea">{text.plea}</div>
        <div className="ticker">
          <span>★ 지금 URL을 넣으면 없던 마크다운이 생길 수도 있습니다 ★ 본 서비스는 보노보노와 관련이 없을 수도 있습니다</span>
        </div>
      </div>
    </div>
  );
}
