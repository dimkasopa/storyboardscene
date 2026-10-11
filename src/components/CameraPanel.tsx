import { useState } from "react";
import {
  ArrowDownToLine,
  Maximize2,
  Minimize2,
  Move,
  Video,
} from "lucide-react";
import {
  applyPreset,
  presets,
  type SceneData,
  type ShotCamera,
} from "../model";
import { CameraPreview } from "./Viewport";
type Props = {
  scene: SceneData;
  expanded: boolean;
  toggleExpanded: () => void;
  fly: boolean;
  playing: boolean;
  previewing: boolean;
  disabled: boolean;
  time: number;
  shake: number;
  onFly: (p: Partial<ShotCamera>) => void;
  exitFly: () => void;
  startFly: () => void;
  exportPNG: () => Promise<void>;
  select: (id: string | null) => void;
  patchCamera: (id: string, p: Partial<ShotCamera>) => void;
  notify: (s: string) => void;
};
export function CameraPanel({
  scene,
  expanded,
  toggleExpanded,
  fly,
  playing,
  previewing,
  disabled,
  time,
  shake,
  onFly,
  exitFly,
  startFly,
  exportPNG,
  select,
  patchCamera,
  notify,
}: Props) {
  const camera = scene.cameras.find((c) => c.id === scene.activeCameraId)!;
  const [person, setPerson] = useState(""),
    [foreground, setForeground] = useState("__auto__"),
    [preset, setPreset] = useState("Средний");
  const people = scene.objects.filter((o) => o.kind === "person");
  const personId = people.some((p) => p.id === person)
      ? person
      : people[0]?.id || "",
    foregroundId =
      foreground === ""
        ? ""
        : people.some((p) => p.id === foreground && p.id !== personId)
          ? foreground
          : people.find((p) => p.id !== personId)?.id || "";
  return (
    <section className="preview-stage">
      <div className="stage-heading">
        <span>
          <Video size={15} /> Кадр камеры
        </span>
        <button
          onClick={toggleExpanded}
          title={expanded ? "Уменьшить предпросмотр" : "Увеличить предпросмотр"}
        >
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
      <div className="preview-select">
        <select
          aria-label="Активная камера"
          disabled={disabled}
          value={camera.id}
          onChange={(e) => select(e.target.value)}
        >
          {scene.cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span>{camera.focal.toFixed(0)} мм</span>
        <span>{camera.format}</span>
      </div>
      <div className="preview-mat">
        <CameraPreview
          scene={scene}
          fly={fly}
          onFly={onFly}
          onExit={exitFly}
          time={time}
          shake={shake}
        />
        <div className="preview-caption">
          <span className="live-dot" />{" "}
          {fly
            ? "УПРАВЛЕНИЕ КАМЕРОЙ"
            : playing
              ? "ВОСПРОИЗВЕДЕНИЕ"
              : "ПРЕДПРОСМОТР"}
          <span>
            {camera.format} · {camera.focal.toFixed(0)} mm
          </span>
        </div>
      </div>
      <div className="camera-actions">
        <button
          className={fly ? "accent" : ""}
          disabled={!!playing || previewing}
          onClick={startFly}
        >
          <Move size={14} /> {fly ? "Выйти · Esc" : "Войти в камеру"}
        </button>
        <button onClick={exportPNG} title="Скачать текущий вид PNG">
          <ArrowDownToLine size={15} />
        </button>
      </div>
      {fly ? (
        <div className="fly-help">
          <strong>Вы управляете съёмочной камерой</strong>
          <p>
            W A S D — движение · E / Q — вверх / вниз
            <br />
            Зажмите ЛКМ и двигайте мышь — взгляд
            <br />
            Shift — быстрее · Esc — выйти
          </p>
        </div>
      ) : (
        <div className={`presets-panel ${disabled ? "locked" : ""}`}>
          <h4>
            ОТПРАВНАЯ ТОЧКА <span>ракурсы</span>
          </h4>
          <div className="preset-people">
            <label>
              В кадре
              <select
                aria-label="Персонаж для пресета"
                value={personId}
                onChange={(e) => setPerson(e.target.value)}
              >
                {people.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Второй / передний план
              <select
                aria-label="Передний план"
                value={foregroundId}
                onChange={(e) => setForeground(e.target.value)}
              >
                <option value="">Нет</option>
                {people
                  .filter((o) => o.id !== personId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="preset-action">
            <select
              aria-label="Ракурс"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              {presets.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <button
              disabled={!personId}
              onClick={() => {
                if (
                  [
                    "Левое плечо",
                    "Правое плечо",
                    "На двоих",
                    "Реакция",
                  ].includes(preset) &&
                  !foregroundId
                ) {
                  notify("Для этого ракурса нужны два персонажа");
                  return;
                }
                patchCamera(
                  camera.id,
                  applyPreset(camera, scene, preset, personId, foregroundId),
                );
                select(camera.id);
              }}
            >
              Применить
            </button>
          </div>
          <p className="hint">Любой ракурс можно изменить вручную.</p>
        </div>
      )}
    </section>
  );
}
