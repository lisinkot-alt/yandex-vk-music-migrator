import { NextResponse } from "next/server";

export function GET(request: Request) {
  const appId = process.env.VK_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "VK_APP_ID не настроен. Добавьте настройки VK OAuth в .env.local." }, { status: 503 });
  }

  const redirectUri = process.env.VK_REDIRECT_URI ?? new URL("/api/vk/callback", request.url).toString();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    display: "page",
    scope: "audio,offline",
    response_type: "code",
    v: "5.199",
  });
  return NextResponse.redirect(`https://oauth.vk.com/authorize?${params}`);
}