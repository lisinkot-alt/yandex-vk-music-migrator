"use client";

import { useState } from "react";

type ImportedTrack = { artist: string; title: string };

export default function Home() {
  const [connected, setConnected] = useState(true);
  const [importedTracks, setImportedTracks] = useState<ImportedTrack[]>([]);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("Выберите плейлисты, которые хотите перенести");
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const startMigration = async () => {
    if (isImporting) return;
    if (!connected) {
      setNotice("Сначала подключите аккаунты в демо-режиме");
      return;
    }
    if (!importedTracks.length) {
      setNotice("Сначала загрузите MP3-файлы со списком треков");
      return;
    }
    setIsImporting(true);
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
    const body = new FormData();
    files.forEach((file) => body.append("file", file));
    const response = await fetch("/api/import", { method: "POST", body });
    const result = await response.json() as { count?: number; tracks?: ImportedTrack[]; error?: string };
    if (!response.ok) {
      setNotice(result.error ?? "Не удалось импортировать список");
      return;
    }
    setImportedTracks(result.tracks ?? []);
    setImportedCount(result.count ?? result.tracks?.length ?? 0);
    setConnected(true);
    setNotice(`Импортировано ${result.count ?? 0} треков из файла. Теперь подключите VK Музыку.`);
  };

  return (
    <main className="shell">
      <div className="topbar"><a className="brand" href="#top"><span className="brand-mark">↗</span><span>перенос</span></a><div className="topbar-actions"><span className="secure"><span className="secure-dot" /> Только демо-режим</span><button className="avatar">К</button></div></div>
      <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">МУЗЫКА РЯДОМ</p><h1>Вся твоя музыка.<br /><em>В одном месте.</em></h1><p className="hero-text">Перенеси любимые треки и плейлисты из Яндекс Музыки в VK Музыку за несколько минут.</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById("connect")?.scrollIntoView({ behavior: "smooth" })}>Начать перенос <span>↗</span></button><span className="microcopy">Бесплатно · Без паролей</span></div></div><div className="hero-art"><div className="art-disc disc-back" /><div className="art-disc disc-front"><div className="disc-label">♪</div></div><div className="art-note note-one">♪</div><div className="art-note note-two">♫</div><div className="art-caption">your<br /><strong>soundtrack</strong></div></div></section>
      <section className="steps"><div className="step active"><span>01</span><div><strong>Подключи</strong><small>два аккаунта</small></div></div><div className="step-line" /><div className="step"><span>02</span><div><strong>Выбери</strong><small>что перенести</small></div></div><div className="step-line" /><div className="step"><span>03</span><div><strong>Готово</strong><small>наслаждайся</small></div></div></section>
      <section className="workspace" id="connect"><div className="section-heading"><div><p className="eyebrow">ШАГ 01 / ПОДКЛЮЧЕНИЕ</p><h2>Давай познакомимся<br />с твоими аккаунтами</h2></div><p className="heading-note">Мы используем официальную авторизацию.<br />Пароли остаются только у сервисов.</p></div><div className="connect-grid"><label className={`service-card yandex ${importedCount !== null ? "connected" : ""}`}><input className="file-input" type="file" accept=".mp3,.csv,.txt,.json,audio/mpeg" multiple onChange={(event) => event.target.files?.length && importLibrary(Array.from(event.target.files))} /><div className="service-icon yandex-icon">Я</div><div className="service-info"><strong>Яндекс Музыка</strong><span>{importedCount !== null ? `Загружено треков: ${importedCount}` : "Загрузить MP3 или список треков"}</span></div><span className="service-arrow">↥</span></label><div className="transfer-symbol">→</div><a className="service-card vk connected" href="/api/vk/auth"><div className="service-icon vk-icon">VK</div><div className="service-info"><strong>VK Музыка</strong><span>Демо-аккаунт подключён · нажмите для OAuth</span></div><span className="service-arrow">✓</span></a></div><p className="import-hint">Выберите один или несколько MP3-файлов с тегами исполнителя и названия. Если тегов нет, используйте имя файла: Исполнитель - Название.mp3.</p></section>
      <section className="library-section"><div className="section-heading compact"><div><p className="eyebrow">ШАГ 02 / ЗАГРУЖЕННАЯ БИБЛИОТЕКА</p><h2>Что переносим?</h2></div><span className="selected-count">{importedTracks.length} треков к импорту</span></div><div className="library-layout"><div className="uploaded-summary"><div className="uploaded-summary-icon">♪</div><strong>{importedTracks.length ? "Файлы готовы" : "Файлы ещё не загружены"}</strong><small>{importedTracks.length ? `${importedTracks.length} MP3 будут подготовлены для VK` : "Загрузите MP3 в блоке выше"}</small><div className="uploaded-status">{importedTracks.length ? "✓ список прочитан" : "○ ожидает загрузки"}</div></div><div className="preview"><div className="preview-top"><span>СПИСОК ТРЕКОВ</span><span className="live-dot">● к импорту: {importedTracks.length}</span></div>{importedTracks.length ? importedTracks.map((track, index) => <div className="song" key={`${track.artist}-${track.title}-${index}`}><span className="song-number">{String(index + 1).padStart(2, "0")}</span><span className={`song-thumb thumb-${index % 3}`} /><span className="song-title"><strong>{track.title}</strong><small>{track.artist}</small></span><span className="song-time">MP3</span></div>) : <div className="empty-tracks">Здесь появится список исполнителей и названий из загруженных MP3.</div>}</div></div></section>
      <section className="migration-bar"><div><p className="eyebrow">ПЕРЕНОС В VK</p><h2>{progress === 100 ? "Импорт завершён" : "Добавить треки в VK"}</h2><p className="notice" aria-live="polite">{notice}</p></div><div className="migration-action"><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><button className="primary-button" onClick={startMigration} disabled={isImporting || !importedTracks.length}>{isImporting ? "Обрабатываем..." : progress === 100 ? "Повторить импорт" : "Запустить импорт"} <span>→</span></button></div></section>
      <footer><span>перенос · 2026</span><span>Сделано для тех, кто любит музыку</span><span>Данные защищены</span></footer>
    </main>
  );
}
