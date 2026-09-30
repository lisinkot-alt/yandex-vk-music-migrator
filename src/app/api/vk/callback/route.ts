import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const returnedState = new URL(request.url).searchParams.get("state");
  const requestCookies = await cookies();
  const savedState = requestCookies.get("vk_oauth_state")?.value;
  const codeVerifier = requestCookies.get("vk_code_verifier")?.value;
  const appId = process.env.VK_APP_ID;
  const secret = process.env.VK_APP_SECRET;
  const redirectUri = process.env.VK_REDIRECT_URI ?? new URL("/api/vk/callback", request.url).toString();
  if (!code || !appId || !secret || !codeVerifier || !returnedState || returnedState !== savedState) return NextResponse.redirect(new URL("/?vk=error", request.url));

  const tokenResponse = await fetch("https://id.vk.com/oauth2/auth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: appId, client_secret: secret, redirect_uri: redirectUri, code_verifier: codeVerifier }),
  });
  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/?vk=error", request.url));
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return NextResponse.redirect(new URL("/?vk=error", request.url));

  const response = NextResponse.redirect(new URL("/?vk=connected", request.url));
  response.cookies.set("vk_access_token", token.access_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}