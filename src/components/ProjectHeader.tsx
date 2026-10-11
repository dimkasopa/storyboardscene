import { useRef, useState } from "react";
import {
  Aperture,
  ArrowDownToLine,
  Camera,
  ChevronDown,
  Clapperboard,
  Film,
  FolderOpen,
  HelpCircle,
  Layers,
  Plus,
  Save,
  Upload,
  Video,
} from "lucide-react";
import type { SceneData } from "../model";
import type { useProject } from "../useProject";
import {
  dimensions,
  download,
  exportAnimation,
  exportStoryboard,
  safeName,
  withRenderer,
} from "../export";
type Props = {
  store: ReturnType<typeof useProject>;
  scene: SceneData;
  selectedFrame: string | null;
  resolution: number;
  setResolution: (n: number) => void;
  newProject: () => Promise<void>;
  importFile: (f: File) => Promise<void>;
  onOpen: () => void;
  onHelp: () => void;
  exportPNG: () => Promise<void>;
  run: (fn: () => Promise<void>) => Promise<void>;
  notify: (s: string) => void;
  setBusy: (s: string) => void;
};
export function ProjectHeader({
  store,
  scene,
  selectedFrame,
  resolution,
  setResolution,
  newProject,
  importFile,
  onOpen,
  onHelp,
  exportPNG,
  run,
  notify,
  setBusy,
}: Props) {
  const { project, commit } = store;
  const [exportMenu, setExportMenu] = useState(false),
    [fps, setFps] = useState(12);
  const input = useRef<HTMLInputElement>(null);
  const [w, h] = dimensions(scene, resolution);
  const json = () => {
    download(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      safeName(project.name) + ".json",
    );
    setExportMenu(false);
  };
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">
          <Aperture size={25} />
        </div>
        <div>
          <strong>
            DIRECTOR<span> STUDIO</span>
          </strong>
          <small>Пространство для вашей истории</small>
        </div>
        <span className="version">BETA 1.0</span>
      </div>
      <div className="project-name">
        <input
          aria-label="Название проекта"
          value={project.name}
          maxLength={200}
          onChange={(e) =>
            commit((d) => {
              d.name = e.target.value;
            })
          }
        />
        <span
          className={
            store.status.includes("Не удалось")
              ? "save-state error"
              : "save-state"
          }
        >
          <span /> {store.status}
        </span>
      </div>
      <div className="header-actions">
        <button onClick={() => newProject()} title="Новый проект">
          <Plus size={16} />
          <span>Новый</span>
        </button>
        <button onClick={onOpen}>
          <FolderOpen size={16} />
          <span>Открыть</span>
        </button>
        <button
          title="Сохранить проект"
          onClick={() =>
            run(async () => {
              await store.save();
              notify("Проект сохранён в этом браузере");
            })
          }
        >
          <Save size={16} />
        </button>
        <button
          title="Импорт проекта JSON"
          onClick={() => input.current?.click()}
        >
          <Upload size={16} />
        </button>
        <div className="menu-anchor">
          <button className="accent" onClick={() => setExportMenu(!exportMenu)}>
            <ArrowDownToLine size={16} /> Экспорт <ChevronDown size={13} />
          </button>
          {exportMenu && (
            <div className="dropdown export-dropdown">
              <h4>Забрать результат</h4>
              <label className="field">
                Разрешение PNG
                <select
                  value={resolution}
                  onChange={(e) => setResolution(+e.target.value)}
                >
                  <option value={1920}>Full HD · длинная сторона 1920</option>
                  <option value={1280}>HD · длинная сторона 1280</option>
                  <option value={800}>Черновик · 800</option>
                </select>
              </label>
              <p className="hint">
                Текущий формат: {w} × {h} px
              </p>
              <button
                onClick={async () => {
                  await exportPNG();
                  setExportMenu(false);
                }}
              >
                <Camera size={16} /> Текущий вид камеры · PNG
              </button>
              <button
                disabled={!selectedFrame}
                onClick={() =>
                  run(async () => {
                    const f = project.frames.find(
                      (f) => f.id === selectedFrame,
                    );
                    if (f)
                      await withRenderer(async (r) =>
                        download(
                          await r.blob(f.scene, resolution),
                          safeName(f.name) + ".png",
                        ),
                      );
                  })
                }
              >
                <Film size={16} /> Выбранный кадр · PNG
              </button>
              <button
                onClick={() =>
                  run(() =>
                    exportStoryboard(project, "zip", resolution, setBusy),
                  )
                }
              >
                <Layers size={16} /> Все кадры · ZIP
              </button>
              <button
                onClick={() =>
                  run(() =>
                    exportStoryboard(project, "sheet", resolution, setBusy),
                  )
                }
              >
                <Clapperboard size={16} /> Лист раскадровки · PNG
              </button>
              <hr />
              <label className="field">
                Частота анимации
                <select
                  aria-label="Частота экспорта"
                  value={fps}
                  onChange={(e) => setFps(+e.target.value)}
                >
                  <option value={6}>6 кадров / с</option>
                  <option value={12}>12 кадров / с</option>
                  <option value={24}>24 кадра / с</option>
                </select>
              </label>
              <button
                onClick={() =>
                  run(() => exportAnimation(project, fps, resolution, setBusy))
                }
              >
                <Video size={16} /> Движение · PNG в ZIP
              </button>
              <p className="hint">
                До 241 изображения за экспорт. Видеокодирования нет.
              </p>
              <hr />
              <button onClick={json}>
                <ArrowDownToLine size={16} /> Проект · JSON (резервная копия)
              </button>
            </div>
          )}
        </div>
        <button title="Помощь" onClick={onHelp}>
          <HelpCircle size={18} />
        </button>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importFile(f);
          e.target.value = "";
        }}
      />
    </header>
  );
}
