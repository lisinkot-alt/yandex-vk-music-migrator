"use client";

import { useEffect, useRef, useState } from "react";
import { parseBlob } from "music-metadata";

type ImportedTrack = { artist: string; title: string };

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [importedTracks, setImportedTracks] = useState<ImportedTrack[]>([]);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState(() => {
    if (typeof window === "undefined") return "Выберите плейлисты, которые хотите перенести";
    const authError = new URLSearchParams(window.location.search).get("reason");
    return authError ? `VK не завершил вход: ${authError}` : "Выберите плейлисты, которые хотите перенести";
  });
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [playerFile, setPlayerFile] = useState<File | null>(null);
  const [playerUrl, setPlayerUrl] = useState("/kak%20lovinu.mp3");
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<HTMLAudioElement>(null);
  const playerUrlRef = useRef("");

  const setPlayerTrack = (file: File) => {
    if (playerUrlRef.current) URL.revokeObjectURL(playerUrlRef.current);
    const url = URL.createObjectURL(file);
    playerUrlRef.current = url;
    setPlayerUrl(url);
    setPlayerFile(file);
    setIsPlaying(false);
  };

  const togglePlayer = async () => {
    if (!playerRef.current || !playerUrl) {
      setNotice("Сначала выберите MP3 для плеера");
      return;
    }
    if (playerRef.current.paused) await playerRef.current.play();
    else playerRef.current.pause();
  };
  const [importError, setImportError] = useState(false);

  useEffect(() => {
    const refreshAuth = () => fetch(`/api/vk/status?ts=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { authenticated?: boolean }) => setConnected(Boolean(result.authenticated)))
      .catch(() => setConnected(false));
    refreshAuth();
    window.addEventListener("focus", refreshAuth);
    return () => window.removeEventListener("focus", refreshAuth);
  }, []);

  const startMigration = async () => {
    if (isImporting) return;
    if (!connected) {
      setNotice("Сначала войдите в VK через карточку VK Музыка выше");
      document.getElementById("connect")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!importedTracks.length) {
      setNotice("Сначала загрузите MP3-файлы со списком треков");
      return;
    }
    setIsImporting(true);
    setImportError(false);
    setProgress(12);
    setNotice("Запрос отправлен. Ищем совпадения в VK...");
    try {
      const response = await fetch("/api/vk/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks: importedTracks }) });
      const result = await response.json() as { imported?: ImportedTrack[]; notFound?: ImportedTrack[]; apiError?: string; error?: string };
      if (!response.ok) {
        setNotice(result.error ?? "VK не разрешил импорт");
        setProgress(0);
        return;
      }
      setProgress(100);
      if (result.apiError) {
        setImportError(true);
        setProgress(0);
        setNotice(`${result.apiError}. Добавлено: ${result.imported?.length ?? 0}.`);
        return;
      }
      setNotice(`В VK добавлено: ${result.imported?.length ?? 0}. Не найдено: ${result.notFound?.length ?? 0}.`);
    } catch {
      setProgress(0);
      setNotice("Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setIsImporting(false);
    }
  };

  const importLibrary = async (files: File[]) => {
    setNotice(`Читаем ${files.length} ${files.length === 1 ? "файл" : "файла"} локально...`);
    try {
      const tracks: ImportedTrack[] = [];
      for (const file of files) {
        if (file.name.toLowerCase().endsWith(".mp3")) {
          const metadata = await parseBlob(file);
          const artist = metadata.common.artist;
          const title = metadata.common.title;
          if (artist && title) {
            tracks.push({ artist, title });
            continue;
          }
          const [fileArtist, ...fileTitle] = file.name.replace(/\.mp3$/i, "").split(/\s+-\s+/);
          if (fileArtist && fileTitle.length) tracks.push({ artist: fileArtist.trim(), title: fileTitle.join(" - ").trim() });
        } else {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch("/api/import", { method: "POST", body });
          const result = await response.json() as { tracks?: ImportedTrack[]; error?: string };
          if (!response.ok) throw new Error(result.error ?? "Не удалось импортировать список");
          tracks.push(...(result.tracks ?? []));
        }
      }
      setImportedTracks(tracks);
      setImportedCount(tracks.length);
      const firstAudio = files.find((file) => file.type.startsWith("audio/") || file.name.toLowerCase().endsWith(".mp3"));
      if (firstAudio) setPlayerTrack(firstAudio);
      setNotice(`Готово: прочитано ${tracks.length} треков. Теперь войдите в VK Музыку.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось прочитать файлы");
      return;
    }
  };

  return (
    <main className="shell">
      <div className="topbar"><a className="brand" href="#top"><span className="brand-mark">↗</span><span>перенос</span></a><div className="topbar-actions"><span className="secure"><span className="secure-dot" /> Только демо-режим</span><button className="avatar">К</button></div></div>
      <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">МУЗЫКА РЯДОМ</p><h1>Вся твоя музыка.<br /><em>В одном месте.</em></h1><p className="hero-text">Перенеси любимые треки и плейлисты из Яндекс Музыки в VK Музыку за несколько минут.</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById("connect")?.scrollIntoView({ behavior: "smooth" })}>Начать перенос <span>↗</span></button><span className="microcopy">Бесплатно · Без паролей</span></div></div><div className="hero-art"><div className="art-disc disc-back" /><div className="art-disc disc-front"><div className="disc-label">♪</div></div><div className="art-note note-one">♪</div><div className="art-note note-two">♫</div><div className="art-caption">your<br /><strong>soundtrack</strong></div><div className="cat cat-left" aria-label="Серый кот приветствует"><span className="cat-ear ear-left" /><span className="cat-ear ear-right" /><span className="cat-face"><i className="cat-eye eye-left" /><i className="cat-eye eye-right" /><b className="cat-nose" /><span className="cat-mouth" /></span><span className="cat-paw paw-left" /><span className="cat-paw paw-right" /></div><div className="cat cat-right" aria-label="Серый кот приветствует"><span className="cat-ear ear-left" /><span className="cat-ear ear-right" /><span className="cat-face"><i className="cat-eye eye-left" /><i className="cat-eye eye-right" /><b className="cat-nose" /><span className="cat-mouth" /></span><span className="cat-paw paw-left" /><span className="cat-paw paw-right" /></div></div></section>
      <section className="steps"><div className="step active"><span>01</span><div><strong>Подключи</strong><small>два аккаунта</small></div></div><div className="step-line" /><div className="step"><span>02</span><div><strong>Выбери</strong><small>что перенести</small></div></div><div className="step-line" /><div className="step"><span>03</span><div><strong>Готово</strong><small>наслаждайся</small></div></div></section>
      <section className="workspace" id="connect"><div className="section-heading"><div><p className="eyebrow">ШАГ 01 / ПОДКЛЮЧЕНИЕ</p><h2>Давай познакомимся<br />с твоими аккаунтами</h2></div><p className="heading-note">Мы используем официальную авторизацию.<br />Пароли остаются только у сервисов.</p></div><div className="connect-grid"><label className={`service-card yandex ${importedCount !== null ? "connected" : ""}`}><input className="file-input" type="file" accept=".mp3,.csv,.txt,.json,audio/mpeg" multiple onChange={(event) => event.target.files?.length && importLibrary(Array.from(event.target.files))} /><div className="service-icon yandex-icon">Я</div><div className="service-info"><strong>Яндекс Музыка</strong><span>{importedCount !== null ? `Загружено треков: ${importedCount}` : "Загрузить MP3 или список треков"}</span></div><span className="service-arrow">↥</span></label><div className="transfer-symbol">→</div><a className={`service-card vk ${connected ? "connected" : ""}`} href="/api/vk/auth"><div className="service-icon vk-icon">VK</div><div className="service-info"><strong>VK Музыка</strong><span>{connected ? "Аккаунт VK подключён" : "Войти через VK OAuth"}</span></div><span className="service-arrow">{connected ? "✓" : "↗"}</span></a></div><p className="import-hint">Выберите один или несколько MP3-файлов с тегами исполнителя и названия. Если тегов нет, используйте имя файла: Исполнитель - Название.mp3.</p></section>
      <section className="library-section"><div className="section-heading compact"><div><p className="eyebrow">ШАГ 02 / ЗАГРУЖЕННАЯ БИБЛИОТЕКА</p><h2>Что переносим?</h2></div><span className="selected-count">{importedTracks.length} треков к импорту</span></div><div className="library-layout"><div className="uploaded-summary"><div className="uploaded-summary-icon">♪</div><strong>{importedTracks.length ? "Файлы готовы" : "Файлы ещё не загружены"}</strong><small>{importedTracks.length ? `${importedTracks.length} MP3 будут подготовлены для VK` : "Загрузите MP3 в блоке выше"}</small><div className="uploaded-status">{importedTracks.length ? "✓ список прочитан" : "○ ожидает загрузки"}</div></div><div className="preview"><div className="preview-top"><span>СПИСОК ТРЕКОВ</span><span className="live-dot">● к импорту: {importedTracks.length}</span></div>{importedTracks.length ? importedTracks.map((track, index) => <div className="song" key={`${track.artist}-${track.title}-${index}`}><span className="song-number">{String(index + 1).padStart(2, "0")}</span><span className={`song-thumb thumb-${index % 3}`} /><span className="song-title"><strong>{track.title}</strong><small>{track.artist}</small></span><span className="song-time">MP3</span></div>) : <div className="empty-tracks">Здесь появится список исполнителей и названий из загруженных MP3.</div>}</div></div></section>
      <section className="migration-bar"><div><p className="eyebrow">ПЕРЕНОС В VK</p><h2>{importError ? "VK заблокировал импорт" : progress === 100 ? "Импорт завершён" : "Добавить треки в VK"}</h2><p className="notice" aria-live="polite">{notice}</p></div><div className="migration-action"><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><button className="primary-button" onClick={startMigration} disabled={isImporting || !importedTracks.length}>{isImporting ? "Обрабатываем..." : progress === 100 || importError ? "Повторить импорт" : "Запустить импорт"} <span>→</span></button></div></section>
      <footer><span>перенос · 2026</span><span>Сделано для тех, кто любит музыку</span><span>Данные защищены</span></footer>
      <section className={`bottom-player ${isPlaying ? "playing" : ""}`} aria-label="Аудиоплеер"><button className="player-play" onClick={togglePlayer} aria-label={isPlaying ? "Пауза" : "Воспроизвести"}>{isPlaying ? "Ⅱ" : "▶"}</button><div className="player-meta"><span className="player-kicker">СЕЙЧАС ИГРАЕТ</span><strong>Главный хит Константина Лисина</strong><small>{playerFile?.name ?? "kak lovinu.mp3"}</small></div><div className="equalizer" aria-hidden="true">{[18, 29, 12, 35, 23, 41, 27, 16, 33, 21, 38, 25, 15, 31, 20, 36].map((height, index) => <i key={index} style={{ height: `${height}px`, animationDelay: `${index * 55}ms` }} />)}</div><audio ref={playerRef} src={playerUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} /></section>
    </main>
  );
}
