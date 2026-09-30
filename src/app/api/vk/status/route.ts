import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const token = (await cookies()).get("vk_access_token")?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  const response = await fetch(`https://api.vk.com/method/users.get?access_token=${encodeURIComponent(token)}&v=5.199`, { cache: "no-store" });
  const result = await response.json() as { response?: unknown[]; error?: { error_msg?: string } };
  if (!result.response?.length) {
    const expired = NextResponse.json({ authenticated: false, error: result.error?.error_msg ?? "VK-токен недействителен" }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
    expired.cookies.delete("vk_access_token");
    return expired;
  }
  return NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}