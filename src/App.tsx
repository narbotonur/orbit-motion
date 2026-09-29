import { useCallback, useEffect, useRef, useState } from "react";
import { emptyObservation } from "./vision/gestures.ts";
import type { Observation } from "./vision/gestures.ts";
import { startCamera, cameraError } from "./vision/camera.ts";
import {
  newGame,
  stepGame,
  taskInstructions,
  taskNames,
  currentSector,
  SECTORS,
} from "./game/engine.ts";
import type { Game } from "./game/engine.ts";
import { readRuns, readUnlocked, saveRun, unlockLevel } from "./game/storage.ts";
import { unlockAudio, chime } from "./game/audio.ts";
import { Board, Station } from "./ui/Board.tsx";
import { Icon, OrbitMark } from "./ui/Icons.tsx";

const connections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
const gestures = [
  {
    icon: "pinch",
    name: "Захвати",
    detail: "Большой + указательный",
    text: "Соедини пальцы и перенеси энергоячейку в порт.",
  },
  {
    icon: "hand",
    name: "Заряди",
    detail: "Раскрытая ладонь",
    text: "Задержи ладонь над модулем, чтобы вернуть питание.",
  },
  {
    icon: "swipe",
    name: "Расчисти",
    detail: "Взмах вправо",
    text: "Проведи раскрытой ладонью и убери помеху.",
  },
];

export default function App() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [videoAspect, setVideoAspect] = useState(4 / 3);
  const [game, setGame] = useState<Game>(newGame);
  const [hand, setHand] = useState<Observation>(() => emptyObservation(0));
  const [runs, setRuns] = useState(readRuns);
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [selectedLevel, setSelectedLevel] = useState(readUnlocked);
  const [storageOk, setStorageOk] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const aborter = useRef<AbortController | null>(null);
  const gameRef = useRef(game),
    handRef = useRef(hand),
    soundRef = useRef(true);
  const testInput = useRef<Observation | null>(null);
  const busy = useRef(false);
  const best = Math.max(0, ...runs.filter((r) => r.startLevel === game.startLevel).map((r) => r.score));
  const stop = useCallback(() => {
    aborter.current?.abort();
    aborter.current = null;
    busy.current = false;
    setLoading(false);
    setActive(false);
    setError("");
    handRef.current = emptyObservation(0);
    setHand(handRef.current);
  }, []);
  useEffect(() => () => aborter.current?.abort(), []);
  useEffect(() => {
    soundRef.current = !muted;
  }, [muted]);

  const begin = async () => {
    if (busy.current) return;
    busy.current = true;
    aborter.current?.abort();
    const controller = new AbortController();
    aborter.current = controller;
    setError("");
    setActive(true);
    setLoading(true);
    setStorageOk(true);
    gameRef.current = newGame(selectedLevel);
    setGame(gameRef.current);
    handRef.current = emptyObservation(0);
    await unlockAudio();
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    try {
      if (!video.current) throw new Error("Video unavailable");
      await startCamera(
        video.current,
        (observation) => {
          handRef.current = observation;
        },
        setStatus,
        (message) => {
          setError(message);
          handRef.current = emptyObservation(0);
        },
        controller.signal,
      );
      if (!controller.signal.aborted) setLoading(false);
    } catch (e) {
      if (!controller.signal.aborted) console.error("ORBIT camera startup:", e);
      if (!controller.signal.aborted) {
        setError(cameraError(e));
        setLoading(false);
      }
    } finally {
      if (aborter.current === controller) busy.current = false;
    }
  };

  useEffect(() => {
    if (!active || loading || error) return;
    let frame = 0,
      previous = performance.now(),
      paint = 0,
      lastEvent = gameRef.current.event;
    const tick = (now: number) => {
      const dt = now - previous;
      previous = now;
      if (!document.hidden) {
        const observation =
          import.meta.env.DEV && testInput.current
            ? { ...testInput.current, at: now }
            : now - handRef.current.at > 600
              ? emptyObservation(now)
              : handRef.current;
        const oldPhase = gameRef.current.phase;
        const oldModule = gameRef.current.module;
        gameRef.current = stepGame(gameRef.current, observation, dt);
        if (gameRef.current.module > oldModule) {
          const nextUnlocked = Math.min(gameRef.current.module, SECTORS.length - 1);
          setStorageOk(unlockLevel(nextUnlocked));
          setUnlocked(readUnlocked());
          setSelectedLevel(nextUnlocked);
        }
        if (observation.swipeRight) {
          handRef.current = { ...handRef.current, swipeRight: false };
          if (testInput.current)
            testInput.current = { ...testInput.current, swipeRight: false };
        }
        if (gameRef.current.event !== lastEvent) {
          if (soundRef.current) chime();
          lastEvent = gameRef.current.event;
        }
        if (gameRef.current.phase === "result" && oldPhase !== "result") {
          const g = gameRef.current;
          const saved = saveRun({
              score: g.score,
              modules: g.module,
              startLevel: g.startLevel,
              corrections: g.correctionCount,
              seconds: Math.round(g.elapsed / 1000),
              finished: g.finished,
              date: new Date().toISOString(),
            });
          setStorageOk((previous) => previous && saved);
          setRuns(readRuns());
        }
        if (now - paint > 50) {
          setGame({ ...gameRef.current });
          setHand(observation);
          paint = now;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, loading, error]);

  // Only the local Vite test server exposes simulated landmark input. Never in production.
  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      !new URLSearchParams(location.search).has("test")
    )
      return;
    const api = {
      observe: (o: Observation) => {
        testInput.current = o;
      },
      state: () => gameRef.current,
    };
    Object.assign(window, { __orbitTest: api });
    return () => {
      delete (window as unknown as Record<string, unknown>).__orbitTest;
    };
  }, []);

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* optional browser feature */
    }
  };
  const phaseLabel = {
    calibration: "Подключение",
    tutorial: "Тренировочный полёт",
    ready: "Всё готово",
    playing: "Миссия",
    interlude: "Уровень пройден",
    result: "Итоги миссии",
  }[game.phase];
  const sector = currentSector(game);
  const currentTask =
    game.task === "carry" ? 0 : game.task === "charge" ? 1 : 2;

  return (
    <div className={`app ${active ? "in-mission" : ""}`}>
      <header className="site-header">
        <a
          className="wordmark"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            stop();
          }}
          aria-label="ORBIT — главная"
        >
          <OrbitMark />
          <span>
            ORBIT<span className="wordmark-dot">.</span>
          </span>
        </a>
        <div className="header-right">
          <span className="header-label mono">OYSAN / ADMIT HACKATHON</span>
          {active ? (
            <>
              <button
                className="icon-button"
                onClick={() => {
                  setMuted(!muted);
                  if (muted) void unlockAudio();
                }}
                aria-label={muted ? "Включить звук" : "Выключить звук"}
                title={muted ? "Включить звук" : "Выключить звук"}
              >
                <Icon name={muted ? "mute" : "sound"} size={20} />
              </button>
              <button
                className="icon-button fullscreen-button"
                onClick={fullscreen}
                aria-label="Полный экран"
              >
                <Icon name="expand" size={19} />
              </button>
              <button className="text-button" onClick={stop}>
                Выйти <Icon name="close" size={16} />
              </button>
            </>
          ) : (
            <a
              className="text-button"
              href="https://github.com/narbotonur/orbit-motion"
              target="_blank"
              rel="noreferrer"
            >
              Исходный код <span>↗</span>
            </a>
          )}
        </div>
      </header>
      {!active ? (
        <main className="landing">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="live-dot" /> КАМЕРА ВМЕСТО ДЖОЙСТИКА
              </div>
              <h1>
                Миссия
                <br />в твоих <em>руках.</em>
              </h1>
              <p className="hero-description">
                Орбитальная станция потеряла связь.
                <br className="desktop-break" /> Пройди 10 уровней и верни её
                в строй движениями руки.
              </p>
              <p className="hero-purpose">
                Игра проверяет основу будущего интерфейса для обучения: выбрать,
                подтвердить, перейти дальше — с обычной веб-камерой.
              </p>
              <button className="primary-button launch" onClick={begin}>
                <Icon name="camera" size={21} /> Подключить камеру{" "}
                <Icon name="arrow" size={20} />
              </button>
              <div className="hero-notes">
                <span>10 уровней</span>
                <i /> <span>3 жеста</span>
                <i />
                <span>Без установки</span>
              </div>
              <div className="privacy-note">
                <Icon name="shield" size={16} />
                <span>
                  Видео обрабатывается на устройстве.
                  <br />
                  Запись и отправка на сервер не ведутся.
                </span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-top">
                <span className="mono">ORBITAL RECOVERY / 07</span>
                <span className="signal-label">
                  <span /> СВЯЗЬ ПОТЕРЯНА
                </span>
              </div>
              <div className="orbit-ring ring-a" />
              <div className="orbit-ring ring-b" />
              <div className="orbit-ring ring-c" />
              <div className="hero-coordinate c1 mono">
                51° N<br />
                71° E
              </div>
              <Station />
              <div className="hero-coordinate c2 mono">
                ALT 408 KM
                <br />
                SYS / STANDBY
              </div>
              <div className="visual-bottom">
                <span className="mission-badge">
                  <span className="pulse-dot" /> Ожидаем оператора
                </span>
                <span className="mono">01 — 10</span>
              </div>
            </div>
          </section>
          <section className="campaign-section" aria-labelledby="campaign-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow">КАМПАНИЯ / 10 УРОВНЕЙ</span>
                <h2 id="campaign-title">Восстанови станцию по частям.</h2>
              </div>
              <p>Пройденные уровни открывают следующие. Прогресс хранится на этом устройстве.</p>
            </div>
            <div className="level-grid">
              {SECTORS.map((level, index) => (
                <button
                  key={level.name}
                  type="button"
                  className={`level-card ${index === selectedLevel ? "selected" : ""} ${index > unlocked ? "locked" : ""}`}
                  disabled={index > unlocked}
                  onClick={() => setSelectedLevel(index)}
                  aria-pressed={index === selectedLevel}
                  aria-label={`Уровень ${index + 1}: ${level.name}${index > unlocked ? ", закрыт" : ""}`}
                >
                  <span className="mono">{String(index + 1).padStart(2, "0")} / {level.act}</span>
                  <strong>{level.name}</strong>
                  <small>{index > unlocked ? "Закрыт" : index < unlocked ? "Открыт" : "Следующий"} · {Math.ceil(level.timeMs / 1000)} с</small>
                </button>
              ))}
            </div>
            <p className="campaign-selection">Выбран уровень {selectedLevel + 1} · {SECTORS[selectedLevel].name}. После обучения начнёшь с него.</p>
          </section>
          <section className="gesture-section" aria-labelledby="gesture-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ПРОСТОЙ ПЛАН СПАСЕНИЯ</span>
                <h2 id="gesture-title">Три жеста. Одна миссия.</h2>
              </div>
              <p>
                Сначала потренируемся.
                <br />
                Таймер включится, когда будешь готов.
              </p>
            </div>
            <div className="gesture-grid">
              {gestures.map((g, i) => (
                <article className="gesture-card" key={g.name}>
                  <div className="gesture-card-top">
                    <div className="gesture-icon">
                      <Icon name={g.icon} size={30} />
                    </div>
                    <span className="mono step-number">0{i + 1}</span>
                  </div>
                  <h3>{g.name}</h3>
                  <span className="gesture-detail">{g.detail}</span>
                  <p>{g.text}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="support-strip">
            <div>
              <span className="small-label">НЕ СРАБОТАЛО С ПЕРВОГО РАЗА?</span>
              <h3>Система подскажет, что поправить.</h3>
              <p>
                Не просто «жест не распознан», а «сблизь пальцы» или «проведи
                ладонью дальше вправо».
              </p>
            </div>
            <div className="sample-correction">
              <span className="sample-icon">!</span>
              <div>
                <strong>Разогни пальцы</strong>
                <span>Для зарядки нужна раскрытая ладонь.</span>
              </div>
            </div>
          </section>
          <section className="vision-section" aria-labelledby="vision-title">
            <div>
              <span className="eyebrow">ЗАЧЕМ МЫ ЭТО ДЕЛАЕМ</span>
              <h2 id="vision-title">
                Сначала игра. Затем — больше способов учиться.
              </h2>
              <p>
                Сегодня эти движения чинят станцию. Та же связка «действие →
                распознавание → конкретная подсказка» может лечь в основу
                интерактивных уроков и управления учебными материалами без мыши.
                ORBIT — проверка первого сценария, а не обещание готового
                универсального решения.
              </p>
            </div>
            <div
              className="vision-mapping"
              aria-label="Жесты и будущие действия"
            >
              <div>
                <span>01 / ЩИПОК</span>
                <strong>Выбрать и переместить</strong>
              </div>
              <div>
                <span>02 / ЛАДОНЬ</span>
                <strong>Подтвердить действие</strong>
              </div>
              <div>
                <span>03 / ВЗМАХ</span>
                <strong>Перейти дальше</strong>
              </div>
            </div>
          </section>
          <footer className="landing-footer">
            <span>
              Сделано командой <b>OySan</b>
            </span>
            <span>
              Лучше начать на ноутбуке · Камера на уровне лица · Ровный свет
            </span>
            <span className="mono">ADMIT ’26</span>
          </footer>
        </main>
      ) : (
        <main className="mission-layout">
          <div className="mission-title">
            <div>
              <span className="eyebrow">ОПЕРАЦИЯ / ВОССТАНОВЛЕНИЕ СТАНЦИИ</span>
              <h1>{phaseLabel}</h1>
            </div>
            <div className="mission-metrics">
              <div>
                <span>УРОВЕНЬ</span>
                <b>
                  {Math.min(game.module + 1, SECTORS.length)}
                  <small>/{SECTORS.length}</small>
                </b>
              </div>
              <div>
                <span>ОЧКИ</span>
                <b>{game.score.toString().padStart(3, "0")}</b>
              </div>
              <div className={game.remaining < 20000 ? "time-low" : ""}>
                <span>
                  {game.paused && game.phase === "playing" ? "ПАУЗА" : game.phase === "result" ? "ОСТАТОК" : "ВРЕМЯ"}
                </span>
                <b>
                  {game.phase === "playing" ||
                  game.phase === "interlude" ||
                  game.phase === "result"
                    ? Math.ceil(game.remaining / 1000)
                    : Math.ceil(sector.timeMs / 1000)}
                  <small>с</small>
                </b>
              </div>
            </div>
          </div>
          {!loading && !error && (
            <div className="campaign-progress" aria-label={`Пройдено ${game.module} из ${SECTORS.length} уровней`}>
              {SECTORS.map((level, index) => (
                <span key={level.name} className={index < game.module ? "done" : index === game.module ? "current" : ""} title={`Уровень ${index + 1}: ${level.name}`} />
              ))}
            </div>
          )}
          {(game.phase === "tutorial" ||
            game.phase === "ready" ||
            game.phase === "playing" ||
            game.phase === "interlude") &&
            !loading &&
            !error && (
              <div className="sector-status">
                <div className="sector-identity">
                  <span className="mono">
                    {game.phase === "tutorial"
                      ? "ОБУЧЕНИЕ"
                      : `УРОВЕНЬ ${String(game.module + 1).padStart(2, "0")} / ${SECTORS.length}`}
                  </span>
                  <strong>{sector.name}</strong>
                  <small>{sector.act} · {sector.goal} · узел {game.wave + 1}/{sector.waves.length}</small>
                </div>
                <div className="sector-steps" aria-label="Этапы восстановления">
                  {(["carry", "charge", "clear"] as const).map(
                    (task, index) => (
                      <span
                        key={task}
                        className={
                          index < currentTask
                            ? "done"
                            : index === currentTask
                              ? "current"
                              : ""
                        }
                        title={taskNames[task]}
                      />
                    ),
                  )}
                </div>
                <div className="combo-readout">
                  <span className="mono">СЕРИЯ</span>
                  <b>x{game.combo}</b>
                </div>
              </div>
            )}
          <div className="game-column">
            {loading || error ? (
              <div className="playfield loading-field">
                <OrbitMark size={76} />
                <h2>
                  {error
                    ? "Не получилось подключиться"
                    : status || "Подключаем камеру…"}
                </h2>
                <p>
                  {error ||
                    "Первый запуск может занять немного времени: загружаем модель распознавания."}
                </p>
                {error ? (
                  <button className="primary-button" onClick={begin}>
                    Попробовать снова <Icon name="arrow" />
                  </button>
                ) : (
                  <div className="loading-track">
                    <span />
                  </div>
                )}
                <button className="text-button light-text" onClick={stop}>
                  Вернуться на главную
                </button>
              </div>
            ) : (
              <Board game={game} hand={hand} best={best} />
            )}
            <div
              className={`feedback-bar ${game.correction ? "needs-adjustment" : ""}`}
              role="status"
            >
              <div className="feedback-symbol">
                <Icon name={game.correction ? "hand" : "check"} size={21} />
              </div>
              <div>
                <span>
                  {loading
                    ? "ПОДКЛЮЧЕНИЕ"
                    : error
                      ? "КАМЕРА НЕДОСТУПНА"
                      : game.correction
                        ? "ПОПРАВЬ ДВИЖЕНИЕ"
                        : "БОРТОВОЙ ПОМОЩНИК"}
                </span>
                <p>{loading ? status : error || game.hint}</p>
              </div>
              {!loading && !error && <span className="feedback-dot" />}
            </div>
            {game.phase === "result" && !storageOk && (
              <p className="storage-notice">
                Браузер не разрешил сохранить рекорд или открытый уровень. Результат этой миссии показан выше.
              </p>
            )}
          </div>
          <aside className="side-column">
            <section className="camera-card">
              <div className="panel-title">
                <h2>Твоя камера</h2>
                <span
                  className={`camera-badge ${!loading && !error && hand.quality === "ok" ? "connected" : ""}`}
                >
                  <i />
                  {loading
                    ? "Подключение"
                    : error
                      ? "Отключена"
                      : hand.quality === "ok"
                        ? "Рука в кадре"
                        : "Ищем руку"}
                </span>
              </div>
              <div
                className="camera-preview"
                style={{ aspectRatio: videoAspect }}
              >
                <video
                  ref={video}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => {
                    if (video.current)
                      setVideoAspect(
                        video.current.videoWidth / video.current.videoHeight ||
                          4 / 3,
                      );
                  }}
                />
                <svg
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                  className={`skeleton ${hand.pinch ? "pinched" : ""}`}
                  aria-hidden="true"
                >
                  {hand.points.length === 21 && (
                    <>
                      {connections.map(([a, b]) => (
                        <line
                          key={`${a}-${b}`}
                          x1={(1 - hand.points[a].x) * 1000}
                          y1={hand.points[a].y * 1000}
                          x2={(1 - hand.points[b].x) * 1000}
                          y2={hand.points[b].y * 1000}
                        />
                      ))}
                      {hand.points.map((p, i) => (
                        <circle
                          key={i}
                          cx={(1 - p.x) * 1000}
                          cy={p.y * 1000}
                          r={i === 4 || i === 8 ? 10 : 5}
                        />
                      ))}
                    </>
                  )}
                </svg>
                <div className="camera-corners" />
                {!hand.points.length && !loading && !error && (
                  <div className="camera-empty">
                    <Icon name="hand" size={34} />
                    <span>Покажи одну руку</span>
                  </div>
                )}
                <span className="camera-local mono">LOCAL ONLY</span>
              </div>
              <div className="recognition-readout">
                <span>
                  {hand.pinch
                    ? "Щипок"
                    : hand.open
                      ? "Раскрытая ладонь"
                      : hand.quality === "ok"
                        ? "Рука видна"
                        : "Нет сигнала"}
                </span>
                <span className="mono">
                  {hand.fps ? `${hand.fps} FPS` : "—"}
                </span>
              </div>
            </section>
            {game.phase === "result" ? (
              <section className="steps-panel outcome-panel">
                <div className="panel-title">
                  <h2>Первый шаг сделан</h2>
                  <span className="mono">ORBIT → OYSAN</span>
                </div>
                <p>
                  Три движения уже позволяют пройти задачу без клавиатуры. В
                  учебном интерфейсе они могут стать такими действиями:
                </p>
                <div>
                  <span>Щипок</span>
                  <b>Выбрать объект</b>
                </div>
                <div>
                  <span>Ладонь</span>
                  <b>Подтвердить</b>
                </div>
                <div>
                  <span>Взмах</span>
                  <b>Перейти дальше</b>
                </div>
                <small>
                  Следующий этап — проверить эти действия в реальном уроке.
                </small>
              </section>
            ) : (
              <section className="steps-panel">
                <div className="panel-title">
                  <h2>
                    {game.phase === "tutorial" ? "Обучение" : "Управление"}
                  </h2>
                  <span className="mono">01—03</span>
                </div>
                {gestures.map((g, i) => (
                  <div
                    key={g.name}
                    className={`control-step ${currentTask === i ? "current" : ""}`}
                  >
                    <div className="control-icon">
                      <Icon name={g.icon} size={22} />
                    </div>
                    <div>
                      <b>{g.name}</b>
                      <span>{g.detail}</span>
                    </div>
                    <span className="mono">0{i + 1}</span>
                  </div>
                ))}
                {(game.phase === "tutorial" || game.phase === "playing") && (
                  <p className="task-description">
                    <b>{taskNames[game.task]}</b>
                    {taskInstructions[game.task]}
                    {game.phase === "playing" &&
                    game.task === "clear" &&
                    game.swipesLeft > 1
                      ? ` Осталось очистить ${game.swipesLeft} потока.`
                      : ""}
                  </p>
                )}
              </section>
            )}
            <div className="camera-tip">
              <Icon name="shield" size={18} />
              <p>
                Видеопоток остаётся в браузере. Для выхода и отключения камеры
                нажми «Выйти».
              </p>
            </div>
          </aside>
          <div className="mission-footer">
            <span>
              Курсор следует за рукой · Играй сидя · Одна рука в кадре
            </span>
            <span>
              Личный рекорд <b>{best}</b>
            </span>
          </div>
        </main>
      )}
    </div>
  );
}
