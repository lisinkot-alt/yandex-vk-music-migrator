import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const authenticated = Boolean((await cookies()).get("vk_access_token")?.value);
  return NextResponse.json({ authenticated });
}