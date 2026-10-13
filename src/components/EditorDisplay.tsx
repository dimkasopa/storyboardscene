import { useRef, useState } from "react";
import { Eye } from "lucide-react";
import { useDismiss } from "../useDismiss";
export type EditorVisibility = {
  grid: boolean;
  personLabels: boolean;
  cameraLabels: boolean;
  frustums: boolean;
};
export const defaultVisibility: EditorVisibility = {
  grid: true,
  personLabels: true,
  cameraLabels: true,
  frustums: true,
};
const labels: Record<keyof EditorVisibility, string> = {
  grid: "Сетка",
  personLabels: "Имена персонажей",
  cameraLabels: "Подписи камер",
  frustums: "Линии обзора камер",
};
export function EditorDisplay({
  value,
  onChange,
}: {
  value: EditorVisibility;
  onChange: (v: EditorVisibility) => void;
}) {
  const [open, setOpen] = useState(false),
    ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  return (
    <div className="editor-display" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title="Вид редактора"
        aria-expanded={open}
      >
        <Eye size={14} /> Вид
      </button>
      {open && (
        <div className="dropdown visibility-menu">
          <h4>Только редактор</h4>
          {(Object.keys(labels) as (keyof EditorVisibility)[]).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={value[key]}
                onChange={(e) =>
                  onChange({ ...value, [key]: e.target.checked })
                }
              />
              {labels[key]}
            </label>
          ))}
          <p className="hint">Эти обозначения не попадают в PNG.</p>
        </div>
      )}
    </div>
  );
}
