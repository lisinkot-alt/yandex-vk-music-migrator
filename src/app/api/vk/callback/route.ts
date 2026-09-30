import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  const code = callbackUrl.searchParams.get("code");
  const returnedState = callbackUrl.searchParams.get("state");
  const oauthError = callbackUrl.searchParams.get("error_description") ?? callbackUrl.searchParams.get("error");
  const requestCookies = await cookies();
  const savedState = requestCookies.get("vk_oauth_state")?.value;
  const codeVerifier = requestCookies.get("vk_code_verifier")?.value;
  const appId = process.env.VK_APP_ID;
  const secret = process.env.VK_APP_SECRET;
  const redirectUri = process.env.VK_REDIRECT_URI ?? new URL("/api/vk/callback", request.url).toString();
  const fail = (reason: string) => NextResponse.redirect(new URL(`/?vk=error&reason=${encodeURIComponent(reason)}`, request.url));
  if (oauthError) return fail(oauthError);
  if (!code || !appId || !secret || !codeVerifier || !returnedState || returnedState !== savedState) return fail("Не удалось проверить OAuth-сессию. Запустите вход ещё раз.");

  const tokenResponse = await fetch("https://id.vk.com/oauth2/auth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: appId, client_secret: secret, redirect_uri: redirectUri, code_verifier: codeVerifier }),
  });
  const token = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };
  if (!tokenResponse.ok || !token.access_token) return fail(token.error_description ?? token.error ?? "VK не выдал токен авторизации");

  const response = NextResponse.redirect(new URL("/?vk=connected", request.url));
  response.cookies.set("vk_access_token", token.access_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  response.cookies.delete("vk_oauth_state");
  response.cookies.delete("vk_code_verifier");
  return response;
}