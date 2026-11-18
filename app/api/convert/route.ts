import { ConvertError, convertUrl } from "@/lib/convert/convert";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : "";

  try {
    return Response.json(await convertUrl(url));
  } catch (error) {
    if (error instanceof ConvertError) {
      return Response.json({ code: error.code, message: error.message }, { status: error.code === "invalid-url" ? 400 : 422 });
    }
    return Response.json({ code: "unknown", message: "변환 중 알 수 없는 오류가 발생했습니다." }, { status: 500 });
  }
}
