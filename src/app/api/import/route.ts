import { NextResponse } from "next/server";
import { parseBuffer } from "music-metadata";

type Track = { artist: string; title: string };

function parseTracks(raw: string, fileName: string): Track[] {
  if (fileName.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(raw) as unknown;
    const rows = Array.isArray(parsed) ? parsed : (parsed as { tracks?: unknown[] })?.tracks;
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row) => {
      if (typeof row === "string") {
        const [artist, ...title] = row.split(" - ");
        return artist && title.length ? [{ artist: artist.trim(), title: title.join(" - ").trim() }] : [];
      }
      if (row && typeof row === "object") {
        const item = row as Record<string, unknown>;
        const artist = item.artist ?? item.artists ?? item.author;
        const title = item.title ?? item.name;
        return typeof artist === "string" && typeof title === "string" ? [{ artist, title }] : [];
      }
      return [];
    });
  }

  return raw.split(/\r?\n/).flatMap((line) => {
    const clean = line.trim().replace(/^\d+[.)]\s*/, "");
    if (!clean || /^(artist|исполнитель|track|трек|title|название)/i.test(clean)) return [];
    const parts = clean.split(/\s+-\s+|\t|;/).map((part) => part.trim()).filter(Boolean);
    return parts.length >= 2 ? [{ artist: parts[0], title: parts.slice(1).join(" - ") }] : [];
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("file").filter((item): item is File => item instanceof File);
  if (!files.length) return NextResponse.json({ error: "Загрузите MP3-файлы или список треков" }, { status: 400 });

  try {
    const tracks = [] as Track[];
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".mp3")) {
        const metadata = await parseBuffer(Buffer.from(await file.arrayBuffer()), { mimeType: "audio/mpeg", path: file.name });
        const artist = metadata.common.artist;
        const title = metadata.common.title;
        if (artist && title) {
          tracks.push({ artist, title });
          continue;
        }
        const [fileArtist, ...fileTitle] = file.name.replace(/\.mp3$/i, "").split(/\s+-\s+/);
        if (fileArtist && fileTitle.length) tracks.push({ artist: fileArtist.trim(), title: fileTitle.join(" - ").trim() });
      } else {
        tracks.push(...parseTracks(await file.text(), file.name));
      }
    }
    return NextResponse.json({ tracks, count: tracks.length });
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файл. Используйте CSV, TXT или JSON." }, { status: 400 });
  }
}