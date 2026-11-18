import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";

export type ConvertErrorCode = "invalid-url" | "fetch-failed" | "empty-content";

export class ConvertError extends Error {
  constructor(
    public code: ConvertErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export type ConvertResult = {
  title: string;
  author: string;
  site: string;
  wordCount: number;
  markdown: string;
};

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ConvertError("invalid-url", "올바른 URL이 아닙니다. http:// 또는 https://로 시작하는 웹 페이지 주소를 입력해 주세요.");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname.includes(".")) {
    throw new ConvertError("invalid-url", "올바른 URL이 아닙니다. http:// 또는 https://로 시작하는 웹 페이지 주소를 입력해 주세요.");
  }
  return url;
}

export async function convertUrl(
  input: string,
  fetcher: Fetcher = fetch,
): Promise<ConvertResult> {
  const url = normalizeUrl(input);

  let response: Response;
  try {
    response = await fetcher(url.href, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; url-to-markdown/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ConvertError("fetch-failed", "페이지에 접속하지 못했습니다. 주소를 확인하거나 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    throw new ConvertError(
      "fetch-failed",
      `페이지를 가져오지 못했습니다(${response.status}). 사이트가 요청을 거부했거나 페이지가 없습니다.`,
      response.status,
    );
  }

  const { document } = parseHTML(await response.text());
  const result = await Defuddle(document, url.href, { markdown: true });
  const markdown = (result.content ?? "").trim();
  if (!markdown) {
    throw new ConvertError("empty-content", "본문을 추출하지 못했습니다. 로그인이 필요하거나 JavaScript로만 그려지는 페이지일 수 있습니다.");
  }

  return {
    title: result.title || url.hostname,
    author: result.author || "",
    site: result.site || result.domain || url.hostname,
    wordCount: result.wordCount ?? 0,
    markdown,
  };
}
