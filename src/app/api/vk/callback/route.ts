import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const appId = process.env.VK_APP_ID;
  const secret = process.env.VK_APP_SECRET;
  const redirectUri = process.env.VK_REDIRECT_URI ?? new URL("/api/vk/callback", request.url).toString();
  if (!code || !appId || !secret) return NextResponse.redirect(new URL("/?vk=error", request.url));

  const tokenUrl = new URL("https://oauth.vk.com/access_token");
  tokenUrl.search = new URLSearchParams({ client_id: appId, client_secret: secret, redirect_uri: redirectUri, code }).toString();
  const tokenResponse = await fetch(tokenUrl);
  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/?vk=error", request.url));
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return NextResponse.redirect(new URL("/?vk=error", request.url));

  const response = NextResponse.redirect(new URL("/?vk=connected", request.url));
  response.cookies.set("vk_access_token", token.access_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}