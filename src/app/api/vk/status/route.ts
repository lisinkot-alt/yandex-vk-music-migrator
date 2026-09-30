import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const authenticated = Boolean((await cookies()).get("vk_access_token")?.value);
  return NextResponse.json({ authenticated }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}