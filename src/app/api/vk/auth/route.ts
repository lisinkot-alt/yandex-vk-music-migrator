import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";

export function GET(request: Request) {
  const appId = process.env.VK_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "VK_APP_ID не настроен. Добавьте настройки VK OAuth в .env.local." }, { status: 503 });
  }

  const redirectUri = process.env.VK_REDIRECT_URI ?? new URL("/api/vk/callback", request.url).toString();
  const state = randomBytes(24).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  const response = NextResponse.redirect(`https://id.vk.com/authorize?${params}`);
  response.cookies.set("vk_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  response.cookies.set("vk_code_verifier", codeVerifier, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return response;
}