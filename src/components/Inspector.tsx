import { appearanceLabels } from "../catalog";
import { useEffect, useState } from "react";
import { Copy, Trash2, UserRound, Video, Crosshair } from "lucide-react";
import {
  type SceneData,
  type SceneObject,
  type ShotCamera,
  type Vec3,
  objectLabel,
  targetPoint,
} from "../model";
import { cameraRotation } from "../world";
export function NumberField({
  label,
  value,
  onChange,
  min = -100,
  max = 100,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const format = (v: number) => String(Number(v.toFixed(3)));
  const [draft, setDraft] = useState(() => format(value));
  useEffect(() => setDraft(format(value)), [value]);
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          setDraft(e.target.value);
          if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber))
            onChange(Math.max(min, Math.min(max, e.target.valueAsNumber)));
        }}
        onBlur={() => setDraft(format(value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
export function VectorFields({
  value,
  onChange,
  labels: ls = ["X · м", "Y · м", "Z · м"],
  min = -100,
  max = 100,
  step = 0.1,
}: {
  value: Vec3;
  onChange: (v: Vec3) => void;
  labels?: string[];
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="vector-fields">
      {value.map((n, i) => (
        <NumberField
          key={i}
          label={ls[i]}
          value={n}
          min={min}
          max={max}
          step={step}
          onChange={(v) => {
            const next = [...value] as Vec3;
            next[i] = v;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}
export function Inspector({
  scene,
  selected,
  patchObject,
  patchCamera,
  onDuplicate,
  onDelete,
}: {
  scene: SceneData;
  selected: string | null;
  patchObject: (id: string, p: Partial<SceneObject>) => void;
  patchCamera: (id: string, p: Partial<ShotCamera>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [lookId, setLookId] = useState("");
  const o = scene.objects.find((o) => o.id === selected),
    c = scene.cameras.find((c) => c.id === selected),
    people = scene.objects.filter(
      (o) => o.kind === "person" && o.id !== selected,
    );
  if (!o && !c)
    return (
      <div className="inspector-empty">
        <Crosshair size={28} />
        <h3>Выберите объект</h3>
        <p>
          Нажмите на персонажа, предмет или камеру в сцене, чтобы изменить его
          параметры.
        </p>
      </div>
    );
  const item = (o || c)!;
  const face = (head: boolean) => {
    const target = people.find((p) => p.id === (lookId || people[0]?.id));
    if (!o || !target) return;
    const yaw =
      (Math.atan2(
        target.position[0] - o.position[0],
        target.position[2] - o.position[2],
      ) *
        180) /
      Math.PI;
    patchObject(
      o.id,
      head
        ? {
            head: Math.max(
              -85,
              Math.min(85, ((yaw - o.rotation + 540) % 360) - 180),
            ),
          }
        : { rotation: yaw },
    );
  };
  return (
    <>
      <div className="inspector-heading">
        {c ? <Video size={18} /> : <UserRound size={18} />}
        <span>{c ? "Съёмочная камера" : objectLabel(o!)}</span>
        <span className="tiny-badge">{c ? "CAM" : "OBJ"}</span>
      </div>
      <label className="field">
        Название
        <input
          aria-label="Название объекта"
          value={item.name}
          maxLength={200}
          onChange={(e) =>
            c
              ? patchCamera(c.id, { name: e.target.value })
              : patchObject(o!.id, { name: e.target.value })
          }
        />
      </label>
      <section>
        <h4>
          Положение <small>метры</small>
        </h4>
        <VectorFields
          value={item.position}
          onChange={(position) =>
            c
              ? patchCamera(c.id, { position })
              : patchObject(o!.id, { position })
          }
        />
      </section>
      {o && (
        <>
          <section>
            <h4>Ориентация</h4>
            <NumberField
              label="Поворот корпуса · °"
              value={o.rotation}
              min={-360}
              max={360}
              step={5}
              onChange={(rotation) => patchObject(o.id, { rotation })}
            />
            {o.kind === "person" && (
              <>
                <NumberField
                  label="Поворот головы · °"
                  value={o.head}
                  min={-85}
                  max={85}
                  step={5}
                  onChange={(head) => patchObject(o.id, { head })}
                />
                <NumberField
                  label="Рост · м"
                  value={o.height}
                  min={0.5}
                  max={3}
                  step={0.05}
                  onChange={(height) => patchObject(o.id, { height })}
                />
              </>
            )}
          </section>
          <section>
            <h4>Внешний вид</h4>
            <label className="color-field">
              Цвет
              <input
                aria-label="Цвет объекта"
                type="color"
                value={o.color}
                onChange={(e) => patchObject(o.id, { color: e.target.value })}
              />
              <code>{o.color}</code>
            </label>
            {o.kind === "person" ? (
              <>
                <label className="field">
                  Силуэт / аксессуар
                  <select
                    aria-label="Внешний вид персонажа"
                    value={o.appearance ?? "base"}
                    onChange={(e) =>
                      patchObject(o.id, {
                        appearance: e.target.value as SceneObject["appearance"],
                      })
                    }
                  >
                    {Object.entries(appearanceLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Короткая метка для раскадровки
                  <input
                    aria-label="Метка персонажа"
                    maxLength={20}
                    placeholder="Например, А или М1"
                    value={o.tag ?? ""}
                    onChange={(e) => patchObject(o.id, { tag: e.target.value })}
                  />
                </label>
                <label className="field">
                  Поза
                  <select
                    aria-label="Поза персонажа"
                    value={o.pose}
                    onChange={(e) =>
                      patchObject(o.id, {
                        pose: e.target.value as SceneObject["pose"],
                      })
                    }
                  >
                    <option value="stand">Стоя</option>
                    <option value="sit">Сидя</option>
                  </select>
                </label>
                <label className="field">
                  Положение рук
                  <select
                    value={o.arms}
                    onChange={(e) =>
                      patchObject(o.id, {
                        arms: e.target.value as SceneObject["arms"],
                      })
                    }
                  >
                    <option value="down">Опущены</option>
                    <option value="raised">Одна рука поднята</option>
                    <option value="front">Перед собой</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <p className="hint">
                  Размеры для куба и стены; масштаб для мебели.
                </p>
                <VectorFields
                  value={o.size}
                  min={0.05}
                  max={100}
                  onChange={(size) => patchObject(o.id, { size })}
                  labels={["Ширина", "Высота", "Глубина"]}
                />
              </>
            )}
          </section>
          {o.kind === "person" && people.length > 0 && (
            <section>
              <h4>Взаимодействие</h4>
              <select
                aria-label="Другой персонаж"
                value={lookId || people[0].id}
                onChange={(e) => setLookId(e.target.value)}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="button-row">
                <button onClick={() => face(false)}>Повернуться</button>
                <button onClick={() => face(true)}>Посмотреть</button>
              </div>
            </section>
          )}
        </>
      )}
      {c && (
        <>
          <section>
            <h4>
              Объектив <small>перспектива</small>
            </h4>
            <NumberField
              label="Фокусное расстояние · мм"
              min={10}
              max={200}
              step={1}
              value={c.focal}
              onChange={(focal) => patchCamera(c.id, { focal })}
            />
            <input
              aria-label="Объектив"
              type="range"
              min={10}
              max={200}
              value={c.focal}
              onChange={(e) => patchCamera(c.id, { focal: +e.target.value })}
            />
            <p className="hint">
              Объектив меняет угол обзора. Для движения ближе к герою меняйте
              координаты камеры.
            </p>
            <label className="field">
              Формат кадра
              <select
                aria-label="Формат кадра"
                value={c.format}
                onChange={(e) =>
                  patchCamera(c.id, {
                    format: e.target.value as ShotCamera["format"],
                  })
                }
              >
                <option>16:9</option>
                <option>9:16</option>
                <option>1:1</option>
              </select>
            </label>
          </section>
          <section>
            <h4>Направление</h4>
            <label className="field">
              Наведение
              <select
                aria-label="Наведение"
                value={c.aim}
                onChange={(e) =>
                  patchCamera(c.id, {
                    aim: e.target.value as ShotCamera["aim"],
                    rotation: cameraRotation(c, scene),
                    target: targetPoint(c, scene),
                    targetId: c.targetId || people[0]?.id || null,
                  })
                }
              >
                <option value="manual">Вручную</option>
                <option value="point">На точку</option>
                <option value="person">На персонажа</option>
              </select>
            </label>
            {c.aim === "person" && (
              <select
                aria-label="Цель камеры"
                value={c.targetId || ""}
                onChange={(e) =>
                  patchCamera(c.id, { targetId: e.target.value })
                }
              >
                <option value="">Выберите персонажа</option>
                {scene.objects
                  .filter((o) => o.kind === "person")
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            )}
            {c.aim === "point" && (
              <VectorFields
                value={c.target}
                labels={["Цель X", "Цель Y", "Цель Z"]}
                onChange={(target) => patchCamera(c.id, { target })}
              />
            )}
            <NumberField
              label="Наклон горизонта · °"
              value={c.rotation[2]}
              min={-180}
              max={180}
              step={1}
              onChange={(v) =>
                patchCamera(c.id, {
                  rotation: [c.rotation[0], c.rotation[1], v],
                })
              }
            />
            {c.aim === "manual" && (
              <>
                <NumberField
                  label="Вверх / вниз · °"
                  value={c.rotation[0]}
                  min={-90}
                  max={90}
                  step={1}
                  onChange={(v) =>
                    patchCamera(c.id, {
                      rotation: [v, c.rotation[1], c.rotation[2]],
                    })
                  }
                />
                <NumberField
                  label="Влево / вправо · °"
                  value={c.rotation[1]}
                  min={-360}
                  max={360}
                  step={1}
                  onChange={(v) =>
                    patchCamera(c.id, {
                      rotation: [c.rotation[0], v, c.rotation[2]],
                    })
                  }
                />
              </>
            )}
          </section>
        </>
      )}
      <section className="button-row">
        <button onClick={onDuplicate}>
          <Copy size={14} /> Копия
        </button>
        <button
          className="danger"
          disabled={!!c && scene.cameras.length === 1}
          onClick={onDelete}
        >
          <Trash2 size={14} /> Удалить
        </button>
      </section>
    </>
  );
}
