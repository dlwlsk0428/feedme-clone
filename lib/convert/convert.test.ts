// @vitest-environment node
import { expect, test } from "vitest";

import { convertUrl, ConvertError } from "@/lib/convert/convert";

const html = `<html><head><title>Use the saw</title>
<meta name="author" content="Steph Ango"></head><body>
<article><h1>Use the saw</h1><p>${"Fear the saw. ".repeat(60)}</p><p>Second paragraph with <b>bold</b>.</p></article>
</body></html>`;

const htmlResponse = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html" } });

test("HTML을 받아 제목, 저자, Markdown을 돌려준다", async () => {
  const result = await convertUrl("https://example.com/saw", async () => htmlResponse(html));
  expect(result.title).toBe("Use the saw");
  expect(result.author).toBe("Steph Ango");
  expect(result.markdown).toContain("**bold**");
});

test("http(s)가 아닌 주소는 invalid-url 오류다", async () => {
  await expect(convertUrl("not a url", async () => htmlResponse(html))).rejects.toMatchObject({
    code: "invalid-url",
  });
  await expect(convertUrl("ftp://example.com", async () => htmlResponse(html))).rejects.toMatchObject({
    code: "invalid-url",
  });
});

test("스킴 없이 입력해도 https로 보정한다", async () => {
  let requested = "";
  await convertUrl("example.com/saw", async (u) => {
    requested = String(u);
    return htmlResponse(html);
  });
  expect(requested).toBe("https://example.com/saw");
});

test("4xx/5xx 응답은 fetch-failed 오류다", async () => {
  await expect(
    convertUrl("https://example.com", async () => htmlResponse("no", 403)),
  ).rejects.toMatchObject({ code: "fetch-failed", status: 403 });
});

test("접속 자체가 실패하면 fetch-failed 오류다", async () => {
  await expect(
    convertUrl("https://example.com", async () => {
      throw new TypeError("fetch failed");
    }),
  ).rejects.toBeInstanceOf(ConvertError);
});

test("본문이 비어 있으면 empty-content 오류다", async () => {
  await expect(
    convertUrl("https://example.com", async () => htmlResponse("<html><body></body></html>")),
  ).rejects.toMatchObject({ code: "empty-content" });
});
