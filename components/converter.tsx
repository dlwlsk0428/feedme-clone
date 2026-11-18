"use client";

import { AlertCircleIcon, CopyIcon, DownloadIcon, InfoIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MarkdownView } from "@/components/markdown-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  composePayload,
  LLM_TARGETS,
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

const PRESETS = ["요약해줘", "한국어로 번역해줘", "쉽게 설명해줘"] as const;
const CUSTOM = "__custom";

export function Converter() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preset, setPreset] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [feedback, setFeedback] = useState("");
  const [clipboardNote, setClipboardNote] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const loading = status.kind === "loading";
  const result = status.kind === "done" ? status.result : null;
  const prompt = preset === CUSTOM ? custom : (preset ?? "");

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
      setStatus({ kind: "error", message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }
  }

  function clear() {
    requestId.current++;
    setUrl("");
    setStatus({ kind: "idle" });
    setPreset(null);
    setCustom("");
    setFeedback("");
    setClipboardNote(false);
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.markdown);
    setFeedback("Markdown을 복사했습니다");
  }

  function download() {
    if (!result) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([result.markdown], { type: "text/markdown" }));
    link.download = markdownFileName(result.title);
    link.click();
    URL.revokeObjectURL(link.href);
    setFeedback(".md 파일을 내려받았습니다");
  }

  function openLlm(target: LlmTarget) {
    if (!result) return;
    const launch = planLlmLaunch(target, composePayload(prompt, result.markdown));
    window.open(launch.url, "_blank", "noopener");
    if (launch.mode === "clipboard") {
      void navigator.clipboard.writeText(launch.text);
      setClipboardNote(true);
      setFeedback(`클립보드에 복사했습니다. ${LLM_TARGETS[target].label}에 붙여넣으세요`);
    } else {
      setClipboardNote(false);
      setFeedback(`${LLM_TARGETS[target].label} 새 대화를 엽니다`);
    }
  }

  const meta = result
    ? [result.author, result.site !== result.author ? result.site : "", result.wordCount ? `${result.wordCount.toLocaleString()} 단어` : ""]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-xl font-semibold tracking-tight">URL → Markdown</h1>
          <p className="text-sm text-muted-foreground">
            웹 페이지 본문을 Markdown으로 바꿔 LLM에 바로 넘깁니다.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void convert();
        }}
      >
        <div className="relative flex-1">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/article"
            inputMode="url"
            aria-label="변환할 URL"
            className="h-10 pr-10"
          />
          {(url || status.kind !== "idle") && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1 right-1"
              onClick={clear}
              aria-label="지우기"
              title="지우기"
            >
              <XIcon />
            </Button>
          )}
        </div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "변환 중…" : "변환하기"}
        </Button>
      </form>

      {status.kind === "idle" && (
        <Empty className="flex-none border border-dashed">
          <EmptyHeader>
            <EmptyTitle>변환할 URL을 입력하세요</EmptyTitle>
            <EmptyDescription>
              URL을 붙여넣고 변환하기를 누르면 본문이 여기에 나타납니다. 시도해 볼 주소: https://stephango.com/saw
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {loading && (
        <Card role="status" aria-label="변환 중">
          <CardHeader>
            <Skeleton className="h-6 w-3/5" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <div className="flex flex-col gap-3 px-5 pb-5">
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Card>
      )}

      {status.kind === "error" && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>변환하지 못했습니다</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-xl leading-snug">{result.title}</CardTitle>
              {meta && <CardDescription>{meta}</CardDescription>}
            </CardHeader>
            <MarkdownView>{result.markdown}</MarkdownView>
          </Card>

          {clipboardNote && (
            <Alert>
              <InfoIcon />
              <AlertTitle>본문이 길어 클립보드로 넘깁니다</AlertTitle>
              <AlertDescription>
                클립보드에 복사했으니 붙여넣으세요. LLM 새 대화가 열리면 입력란에 붙여넣기(Ctrl+V)하면 됩니다.
              </AlertDescription>
            </Alert>
          )}

          <Card className="sticky bottom-0 z-20 gap-3 p-3 shadow-lg" data-testid="export-bar">
            {feedback && (
              <div
                role="status"
                className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground shadow-lg"
              >
                {feedback}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">프롬프트 (선택)</span>
              <ToggleGroup
                value={preset ? [preset] : []}
                onValueChange={(values) => setPreset(values[0] ?? null)}
                variant="outline"
                size="sm"
                spacing={2}
                className="overflow-x-auto"
                aria-label="프롬프트"
              >
                {PRESETS.map((name) => (
                  <ToggleGroupItem key={name} value={name} className="shrink-0">
                    {name}
                  </ToggleGroupItem>
                ))}
                <ToggleGroupItem value={CUSTOM} className="shrink-0">
                  직접 입력
                </ToggleGroupItem>
              </ToggleGroup>
              {preset === CUSTOM && (
                <Textarea
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                  placeholder="LLM에게 시킬 내용을 입력하세요. 저장되지 않고 이번 한 번만 사용됩니다."
                  aria-label="직접 입력 프롬프트"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void copy()}>
                <CopyIcon data-icon="inline-start" />
                복사하기
              </Button>
              <Button variant="outline" onClick={download}>
                <DownloadIcon data-icon="inline-start" />
                .md 다운로드
              </Button>
              <span className="hidden flex-1 sm:block" />
              <Button onClick={() => openLlm("chatgpt")}>ChatGPT로 열기</Button>
              <Button onClick={() => openLlm("claude")}>Claude로 열기</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
