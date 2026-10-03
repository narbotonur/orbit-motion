import { useCallback, useEffect, useRef, useState } from "react";
import { cameraError, startCamera } from "./vision/camera.ts";
import type { HandFrame } from "./vision/camera.ts";
import { OrbitMark } from "./ui/Icons.tsx";
import {
  correctionForMatch,
  createTemplate,
  extractFeatures,
  matchGesture,
  normalizeSequence,
} from "./translator/model.ts";
import type { FeatureFrame, GestureTemplate } from "./translator/model.ts";
import { readVocabulary, saveVocabulary, vocabularyLimit } from "./translator/storage.ts";
import { localizeTree, preferredLocale, saveLocale, translateText } from "./i18n.tsx";
import type { Locale } from "./i18n.tsx";

const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15],
  [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
  const timer = window.setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
  const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
  signal.addEventListener("abort", abort, { once: true });
});

export default function Translator() {
  const [locale, setLocale] = useState<Locale>(preferredLocale);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Камера не подключена");
  const [cameraFailure, setCameraFailure] = useState("");
  const [frame, setFrame] = useState<HandFrame>({ at: 0, hands: [], handedness: [] });
  const [videoAspect, setVideoAspect] = useState(4 / 3);
  const [label, setLabel] = useState("");
  const [templates, setTemplates] = useState<GestureTemplate[]>(readVocabulary);
  const [recording, setRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("Подключи камеру и покажи жест.");
  const [lastMatch, setLastMatch] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const cameraAbort = useRef<AbortController | null>(null);
  const recordAbort = useRef<AbortController | null>(null);
  const recordingRef = useRef(false);
  const latestFrame = useRef<FeatureFrame | null>(null);
  const history = useRef<FeatureFrame[]>([]);
  const templatesRef = useRef(templates);
  const paintAt = useRef(0);
  const classifyAt = useRef(0);
  const missingSince = useRef(0);
  const mismatchSince = useRef(0);
  const candidate = useRef("");
  const stableCount = useRef(0);
  const latched = useRef(false);
  const connectingRef = useRef(false);
  const testOverride = useRef(false);

  useEffect(() => {
    return () => { recordAbort.current?.abort(); cameraAbort.current?.abort(); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "en"
      ? "ORBIT LABS — personal gesture vocabulary"
      : "ORBIT LABS — персональный словарь жестов";
  }, [locale]);

  const stop = useCallback(() => {
    recordAbort.current?.abort();
    cameraAbort.current?.abort();
    cameraAbort.current = null;
    recordingRef.current = false;
    connectingRef.current = false;
    latestFrame.current = null;
    history.current = [];
    latched.current = false;
    setRecording(false);
    setConnecting(false);
    setConnected(false);
    setFrame({ at: 0, hands: [], handedness: [] });
    setCameraStatus("Камера отключена");
  }, []);

  const receive = useCallback((raw: HandFrame, fromTest = false) => {
    if (testOverride.current && !fromTest) return;
    if (raw.at - paintAt.current > 90) {
      setFrame(raw);
      paintAt.current = raw.at;
    }
    const feature = extractFeatures(raw.hands, raw.handedness, raw.at);
    latestFrame.current = feature;
    if (recordingRef.current) return;
    if (!feature) {
      if (!missingSince.current) missingSince.current = raw.at;
      if (raw.at - missingSince.current > 500) {
        history.current = [];
        latched.current = false;
        candidate.current = "";
        stableCount.current = 0;
        setLastMatch("");
        setFeedback(raw.hands.length > 0 ? "Помести руки целиком в кадр и отодвинься на удобное расстояние." : "Покажи руки целиком. Между словами ненадолго убирай руки из кадра.");
      }
      return;
    }
    missingSince.current = 0;
    history.current.push(feature);
    history.current = history.current.filter((item) => raw.at - item.at <= 1250);
    if (raw.at - classifyAt.current < 180 || history.current.length < 8) return;
    classifyAt.current = raw.at;
    const sequence = normalizeSequence(history.current);
    if (!sequence) return;
    const match = matchGesture(sequence, feature.handCount, templatesRef.current);
    if (match?.accepted) {
      mismatchSince.current = 0;
      setLastMatch(match.template.label);
      if (latched.current) {
        setFeedback("Жест добавлен. Убери руки на мгновение, затем покажи следующий.");
        return;
      }
      stableCount.current = candidate.current === match.template.id ? stableCount.current + 1 : 1;
      candidate.current = match.template.id;
      setFeedback(`Похоже на «${match.template.label}». Удержи жест для подтверждения.`);
      if (stableCount.current >= 3) {
        latched.current = true;
        setWords((current) => [...current, match.template.label].slice(-24));
        setFeedback(`Добавлено: «${match.template.label}». Убери руки, чтобы продолжить.`);
      }
    } else {
      candidate.current = "";
      stableCount.current = 0;
      setLastMatch("");
      if (!mismatchSince.current) mismatchSince.current = raw.at;
      if (raw.at - mismatchSince.current > 700) {
        latched.current = false;
        setFeedback(correctionForMatch(match, history.current, templatesRef.current));
      }
    }
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || !new URLSearchParams(location.search).has("test")) return;
    const api = {
      feed: (raw: HandFrame) => { testOverride.current = true; receive(raw, true); },
      vocabulary: () => templatesRef.current,
    };
    Object.assign(window, { __translatorTest: api });
    return () => { delete (window as unknown as Record<string, unknown>).__translatorTest; };
  }, [receive]);

  const connect = async () => {
    if (connectingRef.current || connected) return;
    connectingRef.current = true;
    const controller = new AbortController();
    cameraAbort.current = controller;
    setConnecting(true);
    setCameraFailure("");
    try {
      if (!video.current) throw new Error("Video unavailable");
      await startCamera(
        video.current,
        () => {},
        setCameraStatus,
        (message) => { setCameraFailure(message); setConnected(false); },
        controller.signal,
        { numHands: 2, onFrame: receive },
      );
      if (!controller.signal.aborted) {
        setConnected(true);
        setFeedback(templatesRef.current.length ? "Покажи один из записанных жестов." : "Сначала запиши свой первый жест.");
      }
    } catch (error) {
      if (!controller.signal.aborted) setCameraFailure(cameraError(error));
    } finally {
      connectingRef.current = false;
      if (!controller.signal.aborted) setConnecting(false);
    }
  };

  const record = async () => {
    if (!connected || recordingRef.current || templatesRef.current.length >= vocabularyLimit || !label.trim()) return;
    if (templatesRef.current.some((item) => item.label.toLocaleLowerCase() === label.trim().toLocaleLowerCase())) {
      setRecordingStatus("Такое слово уже есть. Выбери другое или удали старую запись.");
      return;
    }
    const controller = new AbortController();
    recordAbort.current = controller;
    recordingRef.current = true;
    setRecording(true);
    setRecordingStatus("Приготовься: нужны 3 одинаковых повтора.");
    const recordings: FeatureFrame[][] = [];
    try {
      for (let repetition = 1; repetition <= 3; repetition++) {
        for (let seconds = 2; seconds > 0; seconds--) {
          setRecordingStatus(`Повтор ${repetition}/3 · начни через ${seconds}…`);
          await wait(1000, controller.signal);
        }
        setRecordingStatus(`Повтор ${repetition}/3 · покажи жест сейчас`);
        const sample: FeatureFrame[] = [];
        let previousAt = 0;
        const until = performance.now() + 1500;
        while (performance.now() < until) {
          const current = latestFrame.current;
          if (current && current.at !== previousAt) {
            sample.push(current);
            previousAt = current.at;
          }
          await wait(55, controller.signal);
        }
        if (sample.length < 8 || sample.some((item) => item.handCount !== sample[0].handCount)) {
          setRecordingStatus(`Повтор ${repetition} не записан: держи ${sample[0]?.handCount === 2 ? "обе руки" : "руку"} целиком в кадре и повтори запись.`);
          return;
        }
        if (recordings.length && sample[0].handCount !== recordings[0][0].handCount) {
          setRecordingStatus("Во всех трёх повторах используй одинаковое число рук. Начни запись снова.");
          return;
        }
        recordings.push(sample);
        setRecordingStatus(`Повтор ${repetition}/3 готов. Убери руки перед следующим.`);
        await wait(700, controller.signal);
      }
      const template = createTemplate(label, recordings);
      if (!template) {
        setRecordingStatus("Не получилось сохранить жест. Повтори запись при ровном свете.");
        return;
      }
      const updated = [...templatesRef.current, template];
      if (!saveVocabulary(updated)) {
        setStorageWarning("Браузер не дал сохранить словарь. Разреши хранение данных сайта и попробуй снова.");
        setRecordingStatus("Жест не сохранён. Проверь настройки хранения браузера.");
        return;
      }
      templatesRef.current = updated;
      setTemplates(updated);
      setLabel("");
      history.current = [];
      latched.current = true;
      mismatchSince.current = 0;
      setRecordingStatus(`«${template.label}» добавлено. Убери руки и покажи жест снова для проверки.`);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setRecordingStatus("Запись прервалась. Попробуй ещё раз.");
    } finally {
      recordingRef.current = false;
      setRecording(false);
      recordAbort.current = null;
    }
  };

  const remove = (template: GestureTemplate) => {
    if (!window.confirm(translateText(`Удалить жест «${template.label}» с этого устройства?`, locale))) return;
    const updated = templatesRef.current.filter((item) => item.id !== template.id);
    if (!saveVocabulary(updated)) {
      setStorageWarning("Не удалось изменить словарь в браузере.");
      return;
    }
    templatesRef.current = updated;
    setTemplates(updated);
    setLastMatch("");
  };
  const speak = () => {
    if (!words.length || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(words.join(" "));
    utterance.lang = locale === "en" ? "en-US" : "ru-RU";
    window.speechSynthesis.speak(utterance);
  };

  return localizeTree((
    <div className="translator-app">
      <header className="site-header">
        <a className="wordmark" href={`/?lang=${locale}`} aria-label="ORBIT — главная"><OrbitMark /><span>ORBIT<span className="wordmark-dot">.</span></span></a>
        <div className="header-right"><span className="header-label mono">ORBIT LABS / TRANSLATOR</span><button className="language-toggle" type="button" onClick={() => { const next = locale === "ru" ? "en" : "ru"; saveLocale(next); setLocale(next); }} aria-label={locale === "ru" ? "Switch to English" : "Переключить на русский"}>{locale === "ru" ? "EN" : "RU"}</button><a className="text-button" href={`/?lang=${locale}`}>← Вернуться к игре</a></div>
      </header>
      <main className="translator-main">
        <section className="translator-intro">
          <div className="eyebrow"><span className="live-dot" /> ЭКСПЕРИМЕНТАЛЬНЫЙ РЕЖИМ</div>
          <h1>Покажи жест.<br /><em>Получится слово.</em></h1>
          <p>Создай личный словарь движений одной или двух рук. ORBIT запоминает три повтора, затем собирает распознанные слова в сообщение — прямо в браузере.</p>
          <div className="translator-caveat">Это распознавание персональных жестов, <b>не полноценный перевод International Sign</b>. Жестовые языки различаются; для настоящего перевода нужны проверенный корпус и участие носителей.</div>
        </section>
        <div className="translator-grid">
          <section className="translator-camera-panel">
            <div className="translator-panel-header"><div><span className="mono">01 / КАМЕРА</span><h2>Видим обе руки</h2></div><span className={connected ? "translator-live" : "translator-offline"}>{connected ? "● В эфире" : "○ Не подключена"}</span></div>
            <div className="translator-video-wrap" style={{ aspectRatio: videoAspect }}>
              <video ref={video} autoPlay playsInline muted onLoadedMetadata={() => {
                if (video.current) setVideoAspect(video.current.videoWidth / video.current.videoHeight || 4 / 3);
              }} />
              <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
                {frame.hands.map((hand, handIndex) => <g key={handIndex} className={handIndex ? "second-hand" : "first-hand"}>
                  {connections.map(([a, b]) => <line key={`${a}-${b}`} x1={(1 - hand[a].x) * 1000} y1={hand[a].y * 1000} x2={(1 - hand[b].x) * 1000} y2={hand[b].y * 1000} />)}
                  {hand.map((point, index) => <circle key={index} cx={(1 - point.x) * 1000} cy={point.y * 1000} r={index === 4 || index === 8 ? 7 : 4} />)}
                </g>)}
              </svg>
              {!connected && <div className="translator-camera-empty"><OrbitMark size={52} /><span>Видео обрабатывается только на этом устройстве</span></div>}
              <span className="translator-video-badge mono">LOCAL / 2 HANDS MAX</span>
            </div>
            <div className="translator-camera-actions">
              <span>{cameraFailure || (connecting ? cameraStatus : connected ? `${frame.hands.length} из 2 рук в кадре` : cameraStatus)}</span>
              {connected ? <button className="translator-secondary" onClick={stop}>Отключить</button> : <button className="primary-button" disabled={connecting} onClick={connect}>{connecting ? "Подключаем…" : "Подключить камеру"}</button>}
            </div>
            {cameraFailure && <p className="translator-error" role="alert">{cameraFailure}</p>}
            <div className="translator-feedback" role="status"><span>БОРТОВОЙ ПОМОЩНИК</span><p>{recording ? recordingStatus : feedback}</p>{lastMatch && !recording && <strong>Распознано: <span data-no-translate>{lastMatch}</span></strong>}</div>
          </section>
          <div className="translator-side">
            <section className="translator-panel">
              <div className="translator-panel-header"><div><span className="mono">02 / ОБУЧЕНИЕ</span><h2>Добавь слово</h2></div><small>{templates.length}/{vocabularyLimit}</small></div>
              <p>Назови жест и покажи его трижды. Можно использовать обе руки и движение. Запись одного повтора длится 1,5 секунды.</p>
              <label htmlFor="gesture-label">Слово или короткая фраза</label>
              <input id="gesture-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={40} placeholder="Например: мне нужна помощь" disabled={recording} />
              <button className="primary-button translator-record" disabled={!connected || !label.trim() || recording || templates.length >= vocabularyLimit} onClick={record}>{recording ? "Идёт запись…" : "Записать 3 повтора"}</button>
              {recordingStatus && <p className="translator-record-status" role="status">{recordingStatus}</p>}
              {storageWarning && <p className="translator-error" role="alert">{storageWarning}</p>}
            </section>
            <section className="translator-panel">
              <div className="translator-panel-header"><div><span className="mono">03 / СЛОВАРЬ</span><h2>Твои жесты</h2></div></div>
              {!templates.length ? <p className="translator-empty">Словарь пуст. Запиши первый жест, чтобы начать перевод.</p> : <ul className="translator-vocabulary">{templates.map((item) => <li key={item.id}><div><strong data-no-translate>{item.label}</strong><small>{item.handCount === 2 ? "две руки" : "одна рука"} · 3 записи</small></div><button onClick={() => remove(item)} aria-label={`Удалить жест ${item.label}`}>Удалить</button></li>)}</ul>}
              <small className="translator-privacy">На этом устройстве сохраняются введённое слово и координаты рук, но не фото или видео. Словарь другого человека может требовать отдельной записи.</small>
            </section>
          </div>
          <section className="translator-output translator-panel">
            <div className="translator-panel-header"><div><span className="mono">04 / СООБЩЕНИЕ</span><h2>Текст из жестов</h2></div><small>{words.length} слов</small></div>
            <p className="translator-sentence" aria-live="polite" data-no-translate={words.length > 0 ? true : undefined}>{words.join(" ") || "Покажи записанный жест — слово появится здесь."}</p>
            <div className="translator-output-actions"><button className="translator-secondary" disabled={!words.length} onClick={() => setWords((current) => current.slice(0, -1))}>Убрать последнее</button><button className="translator-secondary" disabled={!words.length} onClick={() => setWords([])}>Очистить</button><button className="primary-button" disabled={!words.length || !("speechSynthesis" in window)} onClick={speak}>Озвучить</button></div>
          </section>
        </div>
        <p className="translator-footer">ORBIT TRANSLATOR · прототип персонального словаря, а не средство профессионального перевода. Для реального жестового языка необходимы данные и оценка его носителями.</p>
      </main>
    </div>
  ), locale);
}
