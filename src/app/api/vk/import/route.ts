import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type Track = { artist: string; title: string };
type VkAudio = { id: number; owner_id: number; artist: string; title: string };

async function callVk(method: string, token: string, params: Record<string, string>) {
  const query = new URLSearchParams({ ...params, access_token: token, v: "5.199" });
  const response = await fetch(`https://api.vk.com/method/${method}?${query}`);
  return response.json() as Promise<{ response?: { items?: VkAudio[] }; error?: { error_code?: number; error_msg?: string } }>;
}

export async function POST(request: Request) {
  const token = (await cookies()).get("vk_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Сначала войдите в VK через кнопку авторизации" }, { status: 401 });

  const body = await request.json() as { tracks?: Track[] };
  const tracks = Array.isArray(body.tracks) ? body.tracks.slice(0, 500) : [];
  if (!tracks.length) return NextResponse.json({ error: "Нет треков для импорта" }, { status: 400 });

  const imported: Track[] = [];
  const notFound: Track[] = [];
  let apiError: string | undefined;

  for (const track of tracks) {
    const search = await callVk("audio.search", token, { q: `${track.artist} ${track.title}`, count: "5" });
    if (search.error) {
      apiError = `VK audio.search: ${search.error.error_msg ?? "метод недоступен"} (${search.error.error_code ?? "unknown"})`;
      break;
    }
    const match = search.response?.items?.find((item) => item.artist.toLowerCase() === track.artist.toLowerCase() && item.title.toLowerCase() === track.title.toLowerCase()) ?? search.response?.items?.[0];
    if (!match) {
      notFound.push(track);
      continue;
    }
    const added = await callVk("audio.add", token, { audio_id: String(match.id), owner_id: String(match.owner_id) });
    if (added.error) {
      apiError = `VK audio.add: ${added.error.error_msg ?? "метод недоступен"} (${added.error.error_code ?? "unknown"})`;
      break;
    }
    imported.push(track);
  }

  return NextResponse.json({ imported, notFound, apiError, total: tracks.length });
}