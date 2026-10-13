import {
  characterLabel,
  shotTypeLabels,
  transitionLabels,
  type Frame,
} from "../model";
export function FrameInfo({
  frame,
  patch,
}: {
  frame: Frame;
  patch: (id: string, p: Partial<Frame>) => void;
}) {
  const people = frame.scene.objects.filter((o) => o.kind === "person");
  return (
    <details className="frame-info">
      <summary>
        Постановка кадра{" "}
        <span>
          {frame.shotType
            ? shotTypeLabels[frame.shotType]
            : "Тип плана не задан"}{" "}
          · необязательные поля
        </span>
      </summary>
      <div className="frame-info-grid">
        <label className="field">
          Тип плана
          <select
            aria-label="Тип плана кадра"
            value={frame.shotType ?? ""}
            onChange={(e) =>
              patch(frame.id, { shotType: e.target.value as Frame["shotType"] })
            }
          >
            {Object.entries(shotTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Говорящий персонаж
          <select
            aria-label="Говорящий персонаж"
            value={frame.speakerId ?? ""}
            onChange={(e) =>
              patch(frame.id, { speakerId: e.target.value || null })
            }
          >
            <option value="">Не задан</option>
            {people.map((o) => (
              <option key={o.id} value={o.id}>
                {characterLabel(o)}
              </option>
            ))}
            {frame.speakerId &&
              !people.some((o) => o.id === frame.speakerId) && (
                <option value={frame.speakerId}>Персонаж недоступен</option>
              )}
          </select>
        </label>
        <label className="field">
          Действие или реакция
          <input
            aria-label="Действие или реакция"
            placeholder="Например, пауза и взгляд в камеру"
            maxLength={4000}
            value={frame.action ?? ""}
            onChange={(e) => patch(frame.id, { action: e.target.value })}
          />
        </label>
        <label className="field">
          Движение камеры
          <input
            aria-label="Движение камеры кадра"
            placeholder="Описание движения, если оно задано"
            maxLength={1000}
            value={frame.cameraMovement ?? ""}
            onChange={(e) =>
              patch(frame.id, { cameraMovement: e.target.value })
            }
          />
        </label>
        <label className="field">
          Переход к следующему кадру
          <select
            aria-label="Переход к следующему кадру"
            value={frame.transition ?? ""}
            onChange={(e) =>
              patch(frame.id, {
                transition: e.target.value as Frame["transition"],
              })
            }
          >
            {Object.entries(transitionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {frame.transition === "other" && (
          <label className="field">
            Описание перехода
            <input
              aria-label="Описание перехода"
              maxLength={1000}
              value={frame.transitionNotes ?? ""}
              onChange={(e) =>
                patch(frame.id, { transitionNotes: e.target.value })
              }
            />
          </label>
        )}
      </div>
      <p className="hint">
        Поля описывают ваш замысел. Наведение камеры не определяет говорящего;
        параметры съёмки не определяют тип плана однозначно.
      </p>
    </details>
  );
}
