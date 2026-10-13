import { useEffect, useRef } from "react";
import { Check, Copy, SlidersHorizontal, X } from "lucide-react";
import {
  cameras,
  controls,
  eras,
  situations,
  situationDefaults,
  type ControlKey,
} from "../director/catalog";
import {
  cameraAdvice,
  issues,
  optionAdvice,
  sceneViewpoint,
  statusLabels,
  styleCameraPrompt,
} from "../director/logic";
import { defaultDirector, type DirectorSettings } from "../director/settings";
import type { Project } from "../model";
const controlLabels: Record<ControlKey, string> = {
  operator: "Кто держит камеру и как",
  optics: "Что попадает в кадр",
  focus: "Что остаётся резким",
  color: "Цвет",
  texture: "Фактура изображения",
};
export function DirectorPanel({
  project,
  onChange,
  onClose,
  notify,
}: {
  project: Project;
  onChange: (s: DirectorSettings) => void;
  onClose: () => void;
  notify: (text: string, kind?: "info" | "error") => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key !== "Tab") return;
      const elements = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),select,input,textarea,a[href]",
        ) ?? [],
      ).filter((e) => e.getClientRects().length > 0);
      const first = elements[0],
        last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      opener?.focus();
    };
  }, []);
  const s = project.director ?? defaultDirector;
  const patch = (p: Partial<DirectorSettings>) =>
    onChange({ ...s, ...p, intentional: false });
  const found = issues(s),
    prompt = styleCameraPrompt(s);
  const rank = { recommended: 0, suitable: 1, clarify: 2 };
  const orderedCameras = [...cameras].sort((a, b) =>
    a.id === s.camera
      ? -1
      : b.id === s.camera
        ? 1
        : rank[cameraAdvice(s, a).status] - rank[cameraAdvice(s, b).status],
  );
  const context = sceneViewpoint(project.scene);
  const sceneMismatch =
    context?.viewpoint === "back" &&
    s.viewpoint === "front" &&
    (s.situation === "selfie" || s.operator === "selfie");
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal director-panel"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="director-title"
      >
        <div className="modal-heading">
          <h2 id="director-title">
            <SlidersHorizontal size={20} /> Пульт режиссёра
          </h2>
          <button aria-label="Закрыть пульт режиссёра" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="director-intro">
          Выберите ощущение съёмки, затем уточните устройство и характер
          изображения. Это настройки текстового фрагмента: ракурс 3D-камеры и
          PNG меняются в редакторе сцены.
        </p>
        <div className="director-layout">
          <section className="director-devices">
            <h3>1. Съёмочная ситуация</h3>
            <label className="director-field">
              Как снимаем
              <select
                aria-label="Съёмочная ситуация"
                value={s.situation}
                onChange={(e) =>
                  onChange(
                    situationDefaults(
                      e.target.value as DirectorSettings["situation"],
                    ),
                  )
                }
              >
                {situations.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              {situations.find((x) => x.id === s.situation)!.description} Выбор
              ситуации применяет стартовые настройки; каждый параметр ниже можно
              изменить.
            </p>
            <label className="director-field">
              Эпоха изображения
              <select
                aria-label="Эпоха изображения"
                value={s.era}
                onChange={(e) =>
                  patch({ era: e.target.value as DirectorSettings["era"] })
                }
              >
                {eras.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <h3>2. Камера и способ записи</h3>
            <p className="hint">
              8 типов оборудования. Периоды носителей проверены по справочнику
              PSAP; художественные особенности выбираются отдельно. Точные
              параметры зависят от конкретной модели.
            </p>
            <div className="director-cameras">
              {orderedCameras.map((c) => {
                const advice = cameraAdvice(s, c);
                return (
                  <article
                    key={c.id}
                    className={`director-camera ${s.camera === c.id ? "selected" : ""}`}
                  >
                    <button
                      className="director-camera-choice"
                      aria-pressed={s.camera === c.id}
                      aria-label={`Выбрать: ${c.name}`}
                      onClick={() => patch({ camera: c.id })}
                    >
                      <strong>{c.name}</strong>
                      {s.camera === c.id && <Check size={16} />}
                    </button>
                    <small className="director-period">{c.period}</small>
                    <span className={`director-badge ${advice.status}`}>
                      {statusLabels[advice.status]}
                    </span>
                    <p className="director-reason">{advice.reason}</p>
                    <p>
                      <b>Запись:</b> {c.medium}
                    </p>
                    <p>
                      <b>Изображение:</b> {c.features}
                    </p>
                    <p>
                      <b>Для чего:</b> {c.tasks}
                    </p>
                    <details>
                      <summary>Источники</summary>
                      <p className="director-sources">
                        {c.sources.map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {source.name} ↗
                          </a>
                        ))}
                      </p>
                    </details>
                  </article>
                );
              })}
            </div>
          </section>
          <section className="director-controls">
            <h3>3. Характер съёмки</h3>
            <p className="hint">
              Название камеры не заменяет эти настройки. Шум, дрожь и обработка
              — осознанные приёмы, а не обещание характеристик устройства.
            </p>
            {(Object.keys(controls) as ControlKey[]).map((key) => {
              const selected = controls[key].find((x) => x.id === s[key])!;
              const advice = optionAdvice(s, key, s[key]);
              return (
                <div className="director-setting" key={key}>
                  <label className="director-field">
                    {controlLabels[key]}
                    <select
                      aria-label={controlLabels[key]}
                      value={s[key]}
                      onChange={(e) => patch({ [key]: e.target.value })}
                    >
                      {controls[key].map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} ·{" "}
                          {statusLabels[optionAdvice(s, key, c.id).status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>{selected.effect}</p>
                  <span className={`director-badge ${advice.status}`}>
                    {statusLabels[advice.status]}
                  </span>
                  {advice.status === "clarify" && (
                    <p className="director-reason">{advice.reason}</p>
                  )}
                </div>
              );
            })}
            <div className="director-setting">
              <label className="director-field">
                Как видим героя
                <select
                  aria-label="Ракурс героя в промпте"
                  value={s.viewpoint}
                  onChange={(e) =>
                    patch({
                      viewpoint: e.target
                        .value as DirectorSettings["viewpoint"],
                    })
                  }
                >
                  <option value="front">Со стороны лица</option>
                  <option value="back">Со спины</option>
                  <option value="shoulder">Через плечо</option>
                </select>
              </label>
              <p>
                Выбор относится к тексту. Для совпадения референса установите
                такой же ракурс в сцене.
              </p>
              {context ? (
                <p className="hint">
                  В активной 3D-камере: {context.name},{" "}
                  {context.viewpoint === "back"
                    ? "со спины"
                    : context.viewpoint === "front"
                      ? "со стороны лица"
                      : "боковой ракурс"}{" "}
                  по положению корпуса.{" "}
                  {context.viewpoint && (
                    <button
                      onClick={() => patch({ viewpoint: context.viewpoint! })}
                    >
                      Взять ракурс из сцены
                    </button>
                  )}
                </p>
              ) : (
                <p className="hint">
                  3D-камера не наведена на одного персонажа: ракурс для текста
                  выбирается вручную.
                </p>
              )}
              <label className="director-field">
                Дополнительный ракурс
                <select
                  aria-label="Дополнительный ракурс"
                  value={s.coverage}
                  onChange={(e) =>
                    patch({
                      coverage: e.target.value as DirectorSettings["coverage"],
                    })
                  }
                >
                  <option value="single">Одна камера</option>
                  <option value="second-camera">
                    Второй оператор с задней камерой телефона
                  </option>
                </select>
              </label>
              <p>
                Для обратного ракурса селфи можно снять отдельную вставку вторым
                телефоном. 3D-камера автоматически не добавляется.
              </p>
            </div>
          </section>
          <section className="director-preview">
            <h3>4. Предварительный STYLE/CAMERA</h3>
            <p className="hint">
              Английский фрагмент меняется сразу. Это часть будущего промпта;
              сюжет, монтаж и звук здесь не генерируются.
            </p>
            <label className="director-field">
              Фрагмент на английском
              <textarea
                aria-label="STYLE/CAMERA"
                readOnly
                value={prompt}
                rows={15}
                spellCheck={false}
              />
            </label>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt);
                  notify("STYLE/CAMERA скопирован");
                } catch {
                  notify(
                    "Не удалось скопировать: выделите текст фрагмента вручную.",
                    "error",
                  );
                }
              }}
            >
              <Copy size={15} /> Скопировать фрагмент
            </button>
            <div className="director-advice" aria-live="polite">
              {sceneMismatch && (
                <div className="director-issue">
                  <span className="director-badge clarify">
                    Требует уточнения
                  </span>
                  <p>
                    3D-референс показывает героя со спины, а текст описывает
                    селфи со стороны лица. Для обратного ракурса понадобится
                    отдельная камера или постановочная вставка.
                  </p>
                  <button onClick={() => patch({ viewpoint: "back" })}>
                    Учесть ракурс сцены
                  </button>
                </div>
              )}
              <h4>
                {found.length
                  ? s.intentional
                    ? "Стилизация подтверждена"
                    : "Нужно уточнить замысел"
                  : sceneMismatch
                    ? "Референс и текст расходятся"
                    : "Настройки согласованы"}
              </h4>
              {found.length ? (
                <>
                  {found.map((i) => (
                    <div key={i.id} className="director-issue">
                      <span
                        className={`director-badge ${s.intentional ? "suitable" : "clarify"}`}
                      >
                        {s.intentional
                          ? "Намеренная стилизация"
                          : "Требует уточнения"}
                      </span>
                      <p>{i.reason}</p>
                      <p className="hint">{i.solution}</p>
                      {i.id === "selfie-view" && (
                        <button
                          onClick={() => patch({ coverage: "second-camera" })}
                        >
                          Добавить второй ракурс
                        </button>
                      )}
                    </div>
                  ))}
                  <label className="director-confirm">
                    <input
                      type="checkbox"
                      checked={s.intentional}
                      onChange={(e) =>
                        onChange({ ...s, intentional: e.target.checked })
                      }
                    />{" "}
                    Подтверждаю намеренную стилизацию / постановочную вставку
                  </label>
                  <p className="hint">
                    Подтверждение учитывается в тексте и сбрасывается при
                    изменении настроек.
                  </p>
                </>
              ) : (
                <p>
                  {sceneMismatch
                    ? "Уточните ракурс текста по 3D-сцене кнопкой выше, затем выберите отдельный ракурс или постановочную вставку."
                    : "Устройство, эпоха и фактура не противоречат друг другу. Поведение оператора и ракурс описаны отдельно."}
                </p>
              )}
            </div>
            <p className="director-save">
              {project.director
                ? "Настройки сохраняются вместе с проектом и входят в JSON. Отменить изменение можно после закрытия пульта через Ctrl Z."
                : "Показан стартовый вариант. Настройки появятся в проекте после первого выбора."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
