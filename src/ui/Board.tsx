import {
  REPLAY,
  SECTORS,
  currentSector,
  currentWave,
  gradeGame,
  swipeLane,
  taskNames,
} from "../game/engine.ts";
import type { Game } from "../game/engine.ts";
import type { Observation } from "../vision/gestures.ts";
import { Icon, OrbitMark } from "./Icons.tsx";

const stars = Array.from({ length: 36 }, (_, i) => ({
  x: (i * 137.51 + 39) % 100,
  y: (i * 73.27 + 11) % 100,
  size: i % 4 === 0 ? 2 : 1,
}));
const place = (p: { x: number; y: number }) => ({
  left: `${p.x * 100}%`,
  top: `${p.y * 100}%`,
});

export function Station({ repaired = 0 }: { repaired?: number }) {
  return (
    <svg viewBox="0 0 600 440" className="station" aria-hidden="true">
      <defs>
        <linearGradient id="station-core" x2="1" y2="1">
          <stop stopColor="#53766a" />
          <stop offset="1" stopColor="#14382e" />
        </linearGradient>
        <pattern
          id="solar"
          width="12"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <rect width="12" height="18" fill="#183e35" />
          <path d="M0 0h12v18" fill="none" stroke="#467861" strokeWidth=".8" />
        </pattern>
      </defs>
      <g transform="rotate(-28 300 220)">
        <path d="M88 222h422" stroke="#87a794" strokeWidth="11" />
        <rect
          x="78"
          y="150"
          width="131"
          height="143"
          rx="3"
          fill="url(#solar)"
          stroke="#6f9b83"
          strokeWidth="3"
        />
        <rect
          x="391"
          y="150"
          width="131"
          height="143"
          rx="3"
          fill="url(#solar)"
          stroke="#6f9b83"
          strokeWidth="3"
        />
        <rect
          x="267"
          y="131"
          width="67"
          height="192"
          rx="27"
          fill="url(#station-core)"
          stroke="#97b49a"
          strokeWidth="2"
        />
        <path
          d="M269 159h63m-63 124h63M278 185v71M323 185v71"
          stroke="#7aa38c"
          opacity=".6"
        />
        <path d="M276 125h49l-10-28h-29z" fill="#adc8b0" />
        <path d="M300 96V67m-20-3 20 9 20-9" stroke="#a7c6ad" strokeWidth="3" />
        <circle
          cx="300"
          cy="218"
          r="23"
          fill="#0a251f"
          stroke="#91c5a6"
          strokeWidth="3"
        />
        <circle
          cx="300"
          cy="218"
          r="12"
          fill={repaired ? "#b6f3ca" : "#c3a579"}
          opacity=".85"
        />
        {SECTORS.map((_, i) => (
          <rect
            key={i}
            x={261 + i * 9}
            y="266"
            width="6"
            height="10"
            rx="2"
            fill={i < repaired ? "#b6f3ca" : "#3b5548"}
          />
        ))}
      </g>
    </svg>
  );
}

export function Board({
  game,
  hand,
  best,
}: {
  game: Game;
  hand: Observation;
  best: number;
}) {
  const mode = game.phase;
  const tutorial = mode === "tutorial";
  const tasking = tutorial || mode === "playing";
  const sector = currentSector(game);
  const wave = currentWave(game);
  const lane = swipeLane(game);
  const holdDuration =
    mode === "calibration"
      ? 900
      : tasking && game.task === "charge"
        ? wave.chargeMs
        : 1300;
  const progress = Math.min(1, game.hold / holdDuration);
  return (
    <div
      className={`playfield phase-${mode} ${tasking ? `task-${game.task}` : ""}`}
      data-testid="playfield"
    >
      <div className="starfield">
        {stars.map((s, i) => (
          <i
            key={i}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
            }}
          />
        ))}
      </div>
      <div className="orbit-ring ring-a" />
      <div className="orbit-ring ring-b" />
      <div className="orbit-ring ring-c" />
      <div className="field-top">
        <span className="mono">OS / STATION 07</span>
        <span className="mono">
          {tutorial
            ? "TRAINING"
            : mode === "playing"
              ? "LIVE MISSION"
              : mode === "interlude"
                ? "SYSTEM ONLINE"
                : "HAND CONTROL"}
        </span>
      </div>
      {tasking && (
        <>
          <div className="station-backdrop">
            <Station repaired={game.module} />
          </div>
          {game.task === "carry" && (
            <>
              <svg
                className="transfer-path"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d={`M${wave.source.x * 1000} ${wave.source.y * 1000} C${wave.source.x * 1000 + 140} ${wave.source.y * 1000 + 120} ${wave.dock.x * 1000 - 140} ${wave.dock.y * 1000 - 120} ${wave.dock.x * 1000} ${wave.dock.y * 1000}`}
                />
                <path
                  d={`M${wave.dock.x * 1000 - 30} ${wave.dock.y * 1000 - 20} L${wave.dock.x * 1000} ${wave.dock.y * 1000} L${wave.dock.x * 1000 - 30} ${wave.dock.y * 1000 + 20}`}
                />
              </svg>
              <div
                className="source-label"
                style={{ ...place(wave.source), marginTop: "-58px" }}
              >
                ЭНЕРГОЯЧЕЙКА
              </div>
              <div
                className={`energy-cell ${game.carrying ? "grabbed" : ""}`}
                style={place(game.cell)}
              >
                <span>ϟ</span>
              </div>
            </>
          )}
          {game.task === "carry" && wave.decoy && !tutorial && (
            <div className="decoy-dock" style={place(wave.decoy)} aria-label="Ложный порт">
              <span>×</span>
              <small>ЛОЖНЫЙ ПОРТ</small>
            </div>
          )}
          {game.task !== "clear" && (
            <div
              className={`dock ${game.task === "charge" ? "charging" : ""}`}
              style={place(wave.dock)}
            >
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" className="track" />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  className="progress"
                  strokeDasharray={`${progress * 289} 289`}
                />
              </svg>
              <span>
                {game.task === "charge"
                  ? `${Math.round(progress * 100)}%`
                  : "ПОРТ"}
              </span>
            </div>
          )}
          {game.task === "clear" && (
            <div className="debris-zone" style={{ top: `${lane * 100}%` }}>
              <div className="debris d1" />
              <div className="debris d2" />
              <div className="debris d3" />
              <span className="debris-count">
                ПОТОКОВ ОСТАЛОСЬ: {game.swipesLeft}
              </span>
              <div className="swipe-guide">
                <Icon name="swipe" size={38} />
                <span>Проведи вправо</span>
                <span className="swipe-line">→</span>
              </div>
            </div>
          )}
          <div className="field-bottom">
            <span>{String(game.module + 1).padStart(2, "0")} / {SECTORS.length}</span>
            <span>
              {sector.name} · узел {game.wave + 1}/{sector.waves.length} · {taskNames[game.task]}
            </span>
          </div>
        </>
      )}
      {mode === "calibration" && (
        <div className="field-center">
          <div className="calibration-reticle">
            <Icon name="hand" size={72} />
            <svg viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r="65"
                strokeDasharray={`${progress * 408} 408`}
              />
            </svg>
          </div>
          <h2>Установим связь</h2>
          <p>
            Раскрой одну ладонь перед камерой.
            <br />
            Подержи её в центре около секунды.
          </p>
          <span className="tag dark-tag">
            {Math.round(progress * 100)}% · калибровка
          </span>
        </div>
      )}
      {mode === "ready" && (
        <div className="field-center ready">
          <span className="tag dark-tag">ОБУЧЕНИЕ ПРОЙДЕНО</span>
          <h2>Миссия в твоих руках.</h2>
          <p>
            10 уровней. У каждого свой таймер.
            <br />
            Начнём с уровня {game.module + 1}: {sector.name.toLowerCase()}.
          </p>
          <div className="gesture-button">
            <Icon name="hand" />
            <span>Держи ладонь здесь для старта</span>
            <div style={{ width: `${progress * 100}%` }} />
          </div>
          <small>
            {game.armed
              ? "Курсор руки → центр кнопки"
              : "Сначала сожми или опусти руку"}
          </small>
        </div>
      )}
      {mode === "interlude" && (
        <div className="field-center sector-interlude">
          <Station repaired={game.module} />
          <span className="tag dark-tag">
            УРОВЕНЬ {String(game.module).padStart(2, "0")} / {SECTORS.length} ПРОЙДЕН
          </span>
          <h2>{SECTORS[game.module - 1].name} работает.</h2>
          <p>Следующая цель — {sector.goal.toLowerCase()}.</p>
          <div className="interlude-track">
            <span
              style={{
                width: `${(1 - game.interludeRemaining / 1800) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {mode === "result" && (
        <div className="field-center results">
          <OrbitMark size={48} />
          <span className="tag dark-tag">
            {game.finished
              ? `${game.startLevel === 0 ? "ВСЕ 10 УРОВНЕЙ ПРОЙДЕНЫ" : "ФИНАЛЬНЫЙ УРОВЕНЬ ПРОЙДЕН"} · РАНГ ${gradeGame(game)}`
              : `УРОВЕНЬ ${game.module + 1} НЕ ПРОЙДЕН · ПОПРОБУЙ ЕЩЁ РАЗ`}
          </span>
          <h2>
            {game.finished
              ? "Станция снова в строю."
              : `Повтори «${sector.name}».`}
          </h2>
          <div className="final-score">
            {game.score}
            <span>очков</span>
          </div>
          <div className="result-stats">
            <span>
              <b>{game.module - game.startLevel}/{SECTORS.length - game.startLevel}</b> уровней
            </span>
            <span>
              <b>x{game.bestCombo}</b> лучшая серия
            </span>
            <span>
              <b>{game.correctionCount}</b> подсказок
            </span>
          </div>
          <p className="personal-best">
            Рекорд на этом устройстве: {Math.max(best, game.score)}
          </p>
        </div>
      )}
      {mode === "result" && (
        <div className="replay-target" style={place(REPLAY)}>
          <div className="gesture-button">
            <Icon name="hand" />
            <span>{game.finished ? "Новая кампания" : "Повторить уровень"}</span>
            <div style={{ width: `${progress * 100}%` }} />
          </div>
          <small>
            {game.armed
              ? "Задержи раскрытую ладонь здесь"
              : "Сожми руку, затем раскрой здесь"}
          </small>
        </div>
      )}
      {hand.quality === "ok" && (
        <div
          className={`hand-cursor ${hand.pinch ? "pinched" : ""} ${hand.open ? "opened" : ""}`}
          style={place(hand.pointer)}
        >
          <span />
        </div>
      )}
      {game.paused && mode === "playing" && (
        <div className="tracking-pause">
          <Icon name="pause" size={16} /> Таймер на паузе · верни руку в кадр
        </div>
      )}
    </div>
  );
}
