import { FrameInfo } from "./FrameInfo";
import { timedShots, formatClock } from "../storyboard";
import {
  Play,
  Pause,
  Plus,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Clapperboard,
  KeyRound,
} from "lucide-react";
import type { Project, Frame } from "../model";
import { NumberField } from "./Inspector";
export function Timeline({
  project,
  tab,
  setTab,
  selectedFrame,
  selectFrame,
  addFrame,
  updateFrame,
  patchFrame,
  duplicateFrame,
  deleteFrame,
  moveFrame,
  playing,
  playShots,
  stop,
  time,
  setTime,
  playingAnimation,
  playAnimation,
  previewing,
  editMoment,
  exitPreview,
  addKey,
  deleteKey,
  patchAnimation,
}: {
  project: Project;
  tab: string;
  setTab: (t: string) => void;
  selectedFrame: string | null;
  selectFrame: (id: string) => void;
  addFrame: () => void;
  updateFrame: () => void;
  patchFrame: (id: string, p: Partial<Frame>) => void;
  duplicateFrame: (id: string) => void;
  deleteFrame: (id: string) => void;
  moveFrame: (id: string, d: number) => void;
  playing: boolean;
  playShots: () => void;
  stop: () => void;
  time: number;
  setTime: (t: number) => void;
  playingAnimation: boolean;
  playAnimation: () => void;
  previewing: boolean;
  editMoment: () => void;
  exitPreview: () => void;
  addKey: () => void;
  deleteKey: (id: string) => void;
  patchAnimation: (p: Partial<Project["animation"]>) => void;
}) {
  const timings = timedShots(project);
  const f = project.frames.find((f) => f.id === selectedFrame);
  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <div className="tabs">
          <button
            className={tab === "shots" ? "active" : ""}
            onClick={() => setTab("shots")}
          >
            <Clapperboard size={15} /> Раскадровка{" "}
            <span>{project.frames.length}</span>
          </button>
          <button
            className={tab === "motion" ? "active" : ""}
            onClick={() => setTab("motion")}
          >
            <KeyRound size={15} /> Движение{" "}
            <span>{project.animation.keys.length}</span>
          </button>
        </div>
        {tab === "shots" ? (
          <div className="button-row">
            <button
              disabled={!project.frames.length}
              onClick={playing ? stop : playShots}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
              {playing ? "Пауза" : "Смотреть"}
            </button>
            <button className="accent" onClick={addFrame}>
              <Plus size={15} /> Сохранить кадр
            </button>
          </div>
        ) : (
          <div className="button-row">
            <button
              disabled={project.animation.keys.length < 2}
              onClick={playingAnimation ? stop : playAnimation}
            >
              {playingAnimation ? <Pause size={14} /> : <Play size={14} />}{" "}
              {playingAnimation ? "Пауза" : "Воспроизвести"}
            </button>
            <button className="accent" onClick={addKey}>
              <Plus size={15} /> Ключ в {time.toFixed(1)} с
            </button>
          </div>
        )}
      </div>
      {tab === "shots" ? (
        <>
          <div className="filmstrip">
            {project.frames.map((frame, i) => (
              <button
                className={`frame-card ${frame.id === selectedFrame ? "selected" : ""}`}
                key={frame.id}
                onClick={() => selectFrame(frame.id)}
              >
                <div className="frame-image">
                  {frame.thumbnail ? (
                    <img src={frame.thumbnail} alt={frame.name} />
                  ) : (
                    <Clapperboard size={24} />
                  )}
                  <span className="frame-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="frame-duration">{frame.duration} с</span>
                </div>
                <span className="frame-title">{frame.name}</span>
                <span className="frame-timecode">
                  {formatClock(timings[i].start)}–{formatClock(timings[i].end)}{" "}
                  · {timings[i].format}
                </span>
              </button>
            ))}
            <button className="add-frame" onClick={addFrame}>
              <Plus size={22} />
              <span>Новый кадр</span>
            </button>
          </div>
          {f && (
            <>
              <div className="frame-editor">
                <input
                  aria-label="Название кадра"
                  value={f.name}
                  maxLength={200}
                  onChange={(e) => patchFrame(f.id, { name: e.target.value })}
                />
                <input
                  aria-label="Описание кадра"
                  placeholder="Реплика или заметка…"
                  value={f.notes}
                  maxLength={4000}
                  onChange={(e) => patchFrame(f.id, { notes: e.target.value })}
                />
                <NumberField
                  label="Секунды"
                  value={f.duration}
                  min={0.1}
                  max={300}
                  onChange={(duration) => patchFrame(f.id, { duration })}
                />
                <button
                  title="Обновить кадр текущей сценой"
                  aria-label="Обновить кадр текущей сценой"
                  onClick={updateFrame}
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  title="Копия кадра"
                  aria-label="Копия кадра"
                  onClick={() => duplicateFrame(f.id)}
                >
                  <Copy size={14} />
                </button>
                <button
                  aria-label="Кадр раньше"
                  onClick={() => moveFrame(f.id, -1)}
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  aria-label="Кадр позже"
                  onClick={() => moveFrame(f.id, 1)}
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  aria-label="Удалить кадр"
                  onClick={() => deleteFrame(f.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <FrameInfo key={f.id} frame={f} patch={patchFrame} />
            </>
          )}
        </>
      ) : (
        <div className="motion-panel">
          <div className="motion-settings">
            <NumberField
              label="Длительность · с"
              value={project.animation.duration}
              min={Math.max(0.5, ...project.animation.keys.map((k) => k.time))}
              max={120}
              step={0.5}
              onChange={(duration) => patchAnimation({ duration })}
            />
            <label>
              Интерполяция
              <select
                value={project.animation.easing}
                onChange={(e) =>
                  patchAnimation({
                    easing: e.target.value as "linear" | "smooth",
                  })
                }
              >
                <option value="linear">Линейная</option>
                <option value="smooth">Плавный старт и остановка</option>
              </select>
            </label>
            <label className="shake-label">
              <input
                type="checkbox"
                checked={project.animation.shake > 0}
                onChange={(e) =>
                  patchAnimation({ shake: e.target.checked ? 0.3 : 0 })
                }
              />{" "}
              Ручная камера
              <input
                aria-label="Интенсивность ручной камеры"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={project.animation.shake}
                onChange={(e) => patchAnimation({ shake: +e.target.value })}
              />
            </label>
            <strong>
              {time.toFixed(2)} <small>/ {project.animation.duration} с</small>
            </strong>
          </div>
          <div className="scrubber">
            <input
              aria-label="Время анимации"
              type="range"
              min={0}
              max={project.animation.duration}
              step={0.01}
              value={time}
              onChange={(e) => setTime(+e.target.value)}
            />
            <div className="key-track">
              {project.animation.keys.map((k) => (
                <div
                  className="key-marker"
                  key={k.id}
                  style={{
                    left: `${(k.time / project.animation.duration) * 100}%`,
                  }}
                >
                  <button
                    aria-label={`Ключ ${k.time} с`}
                    onClick={() => setTime(k.time)}
                    title={`${k.time} с`}
                  >
                    ◆
                  </button>
                  <span>{k.time} с</span>
                  <button
                    className="delete-key"
                    aria-label={`Удалить ключ ${k.time}`}
                    onClick={() => deleteKey(k.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="motion-footer">
            <p>
              1. Сохраните ключ → 2. Передвиньте ползунок → 3. Измените сцену →
              4. Добавьте ключ.
            </p>
            {previewing ? (
              <div className="button-row">
                <button onClick={editMoment}>Редактировать этот момент</button>
                <button onClick={exitPreview}>К исходной сцене</button>
              </div>
            ) : (
              <span>Редактирование сцены</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
