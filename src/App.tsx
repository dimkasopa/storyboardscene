import { CameraPanel } from "./components/CameraPanel";
import { ProjectHeader } from "./components/ProjectHeader";
import { SceneList } from "./components/SceneList";
import { ProjectDialogs } from "./components/ProjectDialogs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Aperture,
  Box,
  Check,
  ChevronRight,
  Clapperboard,
  Copy,
  Film,
  HelpCircle,
  Layers,
  Move,
  RotateCcw,
  RotateCw,
  Settings2,
  Trash2,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import {
  clone,
  demoProject,
  makeCamera,
  makeObject,
  parseProject,
  removeEntity,
  sampleAnimation,
  uid,
  type Frame,
  type Project,
  type SceneData,
  type SceneObject,
  type ShotCamera,
  type Vec3,
} from "./model";
import { cameraRotation } from "./world";
import { useProject } from "./useProject";
import { deleteProject, listProjects } from "./storage";
import { download, safeName, withRenderer } from "./export";
import { EditorViewport, type ViewAPI } from "./components/Viewport";
import { Inspector } from "./components/Inspector";
import { Timeline } from "./components/Timeline";

export default function App() {
  const store = useProject(),
    { project, commit, live } = store;
  const [selected, setSelected] = useState<string | null>(null),
    [mode, setMode] = useState<"translate" | "rotate">("translate");
  const [left, setLeft] = useState(true),
    [right, setRight] = useState(true),
    [bottom, setBottom] = useState(true),
    [expanded, setExpanded] = useState(false),
    [fly, setFly] = useState(false);
  const [tab, setTab] = useState("shots"),
    [selectedFrame, setSelectedFrame] = useState<string | null>(null),
    [time, setTime] = useState(0),
    [previewing, setPreviewing] = useState(false),
    [playing, setPlaying] = useState<"shots" | "motion" | null>(null),
    [shotIndex, setShotIndex] = useState(0);
  const [modal, setModal] = useState<"projects" | "help" | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState("");
  const [resolution, setResolution] = useState(1920);
  const api = useRef<ViewAPI | null>(null),
    hydrating = useRef(new Set<string>()),
    operation = useRef(false);
  const onAPI = useCallback((value: ViewAPI) => {
    api.current = value;
  }, []);
  const scene = useMemo(
    () =>
      playing === "shots"
        ? project.frames[shotIndex]?.scene || project.scene
        : previewing
          ? sampleAnimation(project, time)
          : project.scene,
    [project, shotIndex, playing, previewing, time],
  );
  const camera = scene.cameras.find((c) => c.id === scene.activeCameraId)!;
  const stop = useCallback(() => setPlaying(null), []);
  const exitFly = useCallback(() => {
    setFly(false);
    store.end();
  }, [store.end]);
  const notify = useCallback((text: string) => setMessage(text), []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    if (store.ready && !selected) setSelected(project.scene.activeCameraId);
  }, [store.ready]);
  useEffect(() => {
    if (!playing) return;
    let handle = 0,
      start: number | null = null;
    const startTime = time;
    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = (now - start) / 1000;
      if (playing === "motion") {
        const t = startTime + elapsed;
        setTime(Math.min(t, project.animation.duration));
        if (t >= project.animation.duration) {
          setPlaying(null);
          return;
        }
      } else {
        let t = elapsed,
          i = 0;
        while (i < project.frames.length && t >= project.frames[i].duration) {
          t -= project.frames[i].duration;
          i++;
        }
        if (i >= project.frames.length) {
          setPlaying(null);
          return;
        }
        setShotIndex(i);
        setSelectedFrame(project.frames[i].id);
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing, project.animation.duration, project.frames]);
  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (operation.current) return;
      operation.current = true;
      setBusy("Подготовка…");
      try {
        await fn();
      } catch (e) {
        notify(e instanceof Error ? e.message : "Операция не удалась");
      } finally {
        operation.current = false;
        setBusy("");
      }
    },
    [notify],
  );
  const patchObject = (id: string, p: Partial<SceneObject>) =>
    commit((d) => {
      const o = d.scene.objects.find((o) => o.id === id);
      if (o) Object.assign(o, p);
    });
  const patchCamera = (id: string, p: Partial<ShotCamera>) =>
    commit((d) => {
      const c = d.scene.cameras.find((c) => c.id === id);
      if (c) Object.assign(c, p);
    });
  const select = (id: string | null) => {
    if (playing || previewing || busy) return;
    if (fly) exitFly();
    setSelected(id);
    if (
      project.scene.activeCameraId !== id &&
      project.scene.cameras.some((c) => c.id === id)
    )
      commit((d) => {
        d.scene.activeCameraId = id!;
      });
  };
  const duplicate = () => {
    if (!selected) return;
    const o = project.scene.objects.find((o) => o.id === selected),
      c = project.scene.cameras.find((c) => c.id === selected);
    if (
      (o && project.scene.objects.length >= 200) ||
      (c && project.scene.cameras.length >= 50)
    ) {
      notify("Достигнут лимит объектов или камер");
      return;
    }
    const newId = uid();
    commit((d) => {
      if (o) {
        const copy = clone(o);
        copy.id = newId;
        copy.name = (copy.name + " · копия").slice(0, 200);
        copy.position[0] += 0.5;
        d.scene.objects.push(copy);
      }
      if (c) {
        const copy = clone(c);
        copy.id = newId;
        copy.name = (copy.name + " · копия").slice(0, 200);
        d.scene.cameras.push(copy);
        d.scene.activeCameraId = newId;
      }
    });
    setSelected(newId);
  };
  const remove = () => {
    if (!selected) return;
    if (
      project.scene.cameras.length === 1 &&
      project.scene.cameras[0].id === selected
    ) {
      notify("В сцене должна остаться хотя бы одна камера");
      return;
    }
    commit((d) => {
      d.scene = removeEntity(d.scene, selected);
    });
    setSelected(null);
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable]",
        ) ||
        fly ||
        playing ||
        busy ||
        modal ||
        previewing
      )
        return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.code === "KeyZ") {
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
      } else if (meta && e.code === "KeyY") {
        e.preventDefault();
        store.redo();
      } else if (meta && e.code === "KeyD") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.code === "KeyG") {
        setMode("translate");
      } else if (e.code === "KeyR") {
        setMode("rotate");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const onTransform = (id: string, position: Vec3, rotation: Vec3) =>
    live((d) => {
      const o = d.scene.objects.find((o) => o.id === id);
      if (o) {
        o.position = position;
        o.rotation = rotation[1];
      }
      const c = d.scene.cameras.find((c) => c.id === id);
      if (c) {
        c.position = position;
        if (mode === "rotate") {
          c.rotation = rotation;
          c.aim = "manual";
        }
      }
    });
  const onFly = useCallback(
    (p: Partial<ShotCamera>) =>
      live((d) => {
        Object.assign(
          d.scene.cameras.find((c) => c.id === d.scene.activeCameraId)!,
          p,
        );
      }),
    [live],
  );
  const startFly = () => {
    if (fly) {
      exitFly();
      return;
    }
    stop();
    setPreviewing(false);
    store.begin();
    live((d) => {
      const c = d.scene.cameras.find((c) => c.id === d.scene.activeCameraId)!;
      c.rotation = cameraRotation(c, d.scene);
      c.aim = "manual";
    });
    setFly(true);
    setSelected(project.scene.activeCameraId);
  };
  const addObject = (kind: SceneObject["kind"]) => {
    if (project.scene.objects.length >= 200) {
      notify("Лимит: 200 объектов");
      return;
    }
    const o = makeObject(kind);
    o.name += ` ${project.scene.objects.filter((x) => x.kind === kind).length + 1}`;
    commit((d) => {
      d.scene.objects.push(o);
    });
    setSelected(o.id);
  };
  const addCamera = (fromView = false) => {
    if (project.scene.cameras.length >= 50) {
      notify("Лимит: 50 камер");
      return;
    }
    const c = fromView && api.current ? api.current.capture() : makeCamera();
    commit((d) => {
      d.scene.cameras.push(c);
      d.scene.activeCameraId = c.id;
    });
    setSelected(c.id);
  };
  const frameThumb = async (s: SceneData) =>
    withRenderer(async (r) => (await r.canvas(s, 400)).toDataURL("image/png"));
  useEffect(() => {
    if (!store.ready || hydrating.current.has(project.id)) return;
    hydrating.current.add(project.id);
    const id = project.id;
    void (async () => {
      try {
        const thumbnails = await withRenderer(async (r) => {
          const result: Record<string, string> = {};
          for (const f of project.frames)
            if (!f.thumbnail)
              result[f.id] = (await r.canvas(f.scene, 400)).toDataURL(
                "image/png",
              );
          return result;
        });
        if (store.ref.current.id === id && Object.keys(thumbnails).length)
          live((d) => {
            d.frames.forEach((f) => {
              if (!f.thumbnail && thumbnails[f.id])
                f.thumbnail = thumbnails[f.id];
            });
          });
      } catch {
        notify("Миниатюры недоступны: проверьте поддержку WebGL.");
      }
    })();
  }, [store.ready, project.id]);
  const addFrame = () =>
    run(async () => {
      if (project.frames.length >= 100) throw new Error("Лимит: 100 кадров");
      const snapshot = clone(scene);
      const frame: Frame = {
        id: uid(),
        name: `Кадр ${project.frames.length + 1}`,
        duration: 3,
        notes: "",
        scene: snapshot,
        thumbnail: await frameThumb(snapshot),
      };
      commit((d) => {
        d.frames.push(frame);
      });
      setSelectedFrame(frame.id);
      setTab("shots");
      notify("Кадр сохранён. Дальнейшие изменения сцены его не затронут.");
    });
  const updateFrame = () =>
    run(async () => {
      if (!selectedFrame) return;
      const snapshot = clone(scene),
        thumbnail = await frameThumb(snapshot);
      commit((d) => {
        const f = d.frames.find((f) => f.id === selectedFrame);
        if (f) {
          f.scene = snapshot;
          f.thumbnail = thumbnail;
        }
      });
      notify("Выбранный кадр обновлён текущей сценой");
    });
  const selectFrame = (id: string) => {
    if (fly) exitFly();
    stop();
    setPreviewing(false);
    const f = project.frames.find((f) => f.id === id);
    if (f) {
      commit((d) => {
        d.scene = clone(f.scene);
      });
      setSelectedFrame(id);
      setSelected(f.scene.activeCameraId);
    }
  };
  const patchFrame = (id: string, p: Partial<Frame>) =>
    commit((d) => {
      const f = d.frames.find((f) => f.id === id);
      if (f) Object.assign(f, p);
    });
  const resetUI = (p: Project) => {
    if (fly) exitFly();
    store.open(p);
    setSelected(p.scene.activeCameraId);
    setSelectedFrame(null);
    setPreviewing(false);
    stop();
    setTime(0);
    setModal(null);
  };
  const preserve = async () => {
    try {
      await store.save();
      return true;
    } catch {
      return window.confirm(
        "Автосохранение недоступно. Продолжить и потерять несохранённые изменения? Сначала рекомендуем скачать JSON.",
      );
    }
  };
  const newProject = () =>
    run(async () => {
      if (!(await preserve())) return;
      const p = demoProject();
      p.name = "Новая постановка";
      p.frames = [];
      resetUI(p);
    });
  const importFile = (file: File) =>
    run(async () => {
      if (file.size > 50_000_000) throw new Error("Файл больше 50 МБ");
      const p = parseProject(await file.text());
      if (!(await preserve())) return;
      p.id = uid();
      p.updatedAt = Date.now();
      resetUI(p);
      notify("Проект импортирован как отдельная локальная копия");
    });
  const exportPNG = () =>
    run(async () => {
      await withRenderer(async (r) =>
        download(
          await r.blob(scene, resolution, time, project.animation.shake),
          safeName(camera.name) + ".png",
        ),
      );
    });
  const addKey = () => {
    if (project.animation.keys.length >= 100) {
      notify("Лимит: 100 ключевых кадров");
      return;
    }
    const t = Math.min(
        project.animation.duration,
        Math.round(time * 100) / 100,
      ),
      snapshot = clone(scene);
    commit((d) => {
      const old = d.animation.keys.find((k) => Math.abs(k.time - t) < 0.01);
      if (old) old.scene = snapshot;
      else d.animation.keys.push({ id: uid(), time: t, scene: snapshot });
      d.animation.keys.sort((a, b) => a.time - b.time);
    });
    notify(`Ключ сохранён: ${t.toFixed(2)} с`);
  };
  const disabled = !!playing || previewing || !!busy || fly;
  if (!store.ready)
    return (
      <div className="loading">
        <Aperture size={40} />
        <p>Открываем мастерскую…</p>
      </div>
    );
  return (
    <div className="app">
      <ProjectHeader
        store={store}
        scene={scene}
        selectedFrame={selectedFrame}
        resolution={resolution}
        setResolution={setResolution}
        newProject={newProject}
        importFile={importFile}
        exportPNG={exportPNG}
        run={run}
        notify={notify}
        setBusy={setBusy}
        onHelp={() => setModal("help")}
        onOpen={() =>
          run(async () => {
            setProjects(await listProjects());
            setModal("projects");
          })
        }
      />
      <div className="commandbar">
        <div className="breadcrumb">
          <Clapperboard size={15} />
          <span>Мастерская</span>
          <ChevronRight size={12} />
          <strong>{project.name}</strong>
        </div>
        <div className="button-row">
          <button
            disabled={!store.canUndo || disabled}
            onClick={store.undo}
            title="Отменить · Ctrl Z"
          >
            <Undo2 size={15} />
          </button>
          <button
            disabled={!store.canRedo || disabled}
            onClick={store.redo}
            title="Повторить · Ctrl Shift Z"
          >
            <Redo2 size={15} />
          </button>
          <span className="separator" />
          <button
            className={!left ? "active" : ""}
            onClick={() => setLeft(!left)}
            title="Список объектов"
          >
            <Layers size={15} />
          </button>
          <button
            className={!right ? "active" : ""}
            onClick={() => setRight(!right)}
            title="Параметры"
          >
            <Settings2 size={15} />
          </button>
          <button
            className={!bottom ? "active" : ""}
            onClick={() => setBottom(!bottom)}
            title="Раскадровка"
          >
            <Film size={15} />
          </button>
        </div>
      </div>
      <main className="workspace">
        {left && (
          <SceneList
            scene={project.scene}
            selected={selected}
            disabled={disabled}
            onClose={() => setLeft(false)}
            select={select}
            addObject={addObject}
            addCamera={addCamera}
          />
        )}
        <div className="center-column">
          <div className={`stages ${expanded ? "preview-expanded" : ""}`}>
            {!expanded && (
              <section className="editor-stage">
                <div className="stage-heading">
                  <span>
                    <Box size={15} /> Обзор сцены
                  </span>
                  <span className="view-pill">3D · РЕДАКТОР</span>
                </div>
                <div className="editor-canvas">
                  <EditorViewport
                    scene={scene}
                    selected={selected}
                    onSelect={select}
                    onTransform={onTransform}
                    begin={store.begin}
                    end={store.end}
                    mode={mode}
                    onAPI={onAPI}
                    disabled={disabled}
                  />
                  <div className="view-toolbar">
                    <button
                      onClick={() => api.current?.view("perspective")}
                      title="Вернуть удобный обзор"
                    >
                      <RotateCcw size={14} />
                    </button>
                    {[
                      ["perspective", "Перспектива"],
                      ["top", "Сверху"],
                      ["front", "Спереди"],
                      ["side", "Сбоку"],
                    ].map(([key, label]) => (
                      <button key={key} onClick={() => api.current?.view(key)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="transform-toolbar">
                    <button
                      className={mode === "translate" ? "active" : ""}
                      onClick={() => setMode("translate")}
                      title="Перемещение · G"
                    >
                      <Move size={17} />
                    </button>
                    <button
                      className={mode === "rotate" ? "active" : ""}
                      onClick={() => setMode("rotate")}
                      title="Поворот · R"
                    >
                      <RotateCw size={17} />
                    </button>
                    <span />
                    <button
                      disabled={disabled}
                      onClick={duplicate}
                      title="Дублировать · Ctrl D"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      disabled={disabled}
                      onClick={remove}
                      title="Удалить · Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="axis-legend">
                    <b className="axis-y">Y</b>
                    <span>
                      <b className="axis-z">Z</b>
                      <b className="axis-x">X</b>
                    </span>
                  </div>
                </div>
                <div className="stage-footer">
                  <span>ЛКМ — вращать · ПКМ — сдвиг · колесо — масштаб</span>
                  <span>1 клетка = 1 м</span>
                </div>
              </section>
            )}
            <CameraPanel
              scene={scene}
              expanded={expanded}
              toggleExpanded={() => setExpanded(!expanded)}
              fly={fly}
              playing={!!playing}
              previewing={previewing}
              disabled={disabled}
              time={time}
              shake={project.animation.shake}
              onFly={onFly}
              exitFly={exitFly}
              startFly={startFly}
              exportPNG={exportPNG}
              select={select}
              patchCamera={patchCamera}
              notify={notify}
            />
          </div>
          {bottom && (
            <Timeline
              project={project}
              tab={tab}
              setTab={setTab}
              selectedFrame={selectedFrame}
              selectFrame={selectFrame}
              addFrame={addFrame}
              updateFrame={updateFrame}
              patchFrame={patchFrame}
              duplicateFrame={(id) => {
                if (project.frames.length >= 100) {
                  notify("Лимит: 100 кадров");
                  return;
                }
                commit((d) => {
                  const i = d.frames.findIndex((f) => f.id === id);
                  const f = clone(d.frames[i]);
                  f.id = uid();
                  f.name = (f.name + " · копия").slice(0, 200);
                  d.frames.splice(i + 1, 0, f);
                });
              }}
              deleteFrame={(id) => {
                commit((d) => {
                  d.frames = d.frames.filter((f) => f.id !== id);
                });
                setSelectedFrame(null);
              }}
              moveFrame={(id, dir) =>
                commit((d) => {
                  const i = d.frames.findIndex((f) => f.id === id),
                    j = i + dir;
                  if (j >= 0 && j < d.frames.length)
                    [d.frames[i], d.frames[j]] = [d.frames[j], d.frames[i]];
                })
              }
              playing={playing === "shots"}
              playShots={() => {
                if (fly) exitFly();
                setPreviewing(false);
                setShotIndex(0);
                setPlaying("shots");
              }}
              stop={stop}
              time={time}
              setTime={(t) => {
                stop();
                setTime(t);
                setPreviewing(project.animation.keys.length > 0);
              }}
              playingAnimation={playing === "motion"}
              playAnimation={() => {
                if (fly) exitFly();
                if (time >= project.animation.duration) setTime(0);
                setPreviewing(true);
                setPlaying("motion");
              }}
              previewing={previewing}
              editMoment={() => {
                stop();
                commit((d) => {
                  d.scene = clone(scene);
                });
                setPreviewing(false);
              }}
              exitPreview={() => {
                stop();
                setPreviewing(false);
              }}
              addKey={addKey}
              deleteKey={(id) =>
                commit((d) => {
                  d.animation.keys = d.animation.keys.filter(
                    (k) => k.id !== id,
                  );
                })
              }
              patchAnimation={(p) =>
                commit((d) => {
                  Object.assign(d.animation, p);
                })
              }
            />
          )}
        </div>
        {right && (
          <aside className={`inspector ${disabled ? "locked" : ""}`}>
            <div className="panel-title">
              <span>ПАРАМЕТРЫ</span>
              <button
                title="Свернуть параметры"
                onClick={() => setRight(false)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="inspector-scroll">
              <Inspector
                scene={scene}
                selected={selected}
                patchObject={patchObject}
                patchCamera={patchCamera}
                onDuplicate={duplicate}
                onDelete={remove}
              />
            </div>
          </aside>
        )}
      </main>
      <footer className="statusbar">
        <span>
          <span className="live-dot" /> Локальная мастерская{" "}
          <span className="muted">· Без облачных загрузок</span>
        </span>
        <span>
          {project.scene.objects.length} объектов ·{" "}
          {project.scene.cameras.length} камер <span className="separator" />{" "}
          <button onClick={() => setModal("help")}>
            Клавиши и помощь <HelpCircle size={12} />
          </button>
        </span>
      </footer>
      {message && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{message}</span>
          <button
            aria-label="Закрыть уведомление"
            onClick={() => setMessage("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {busy && (
        <div className="busy-overlay" role="status">
          <div>
            <Aperture className="spin" size={28} />
            <strong>{busy}</strong>
            <p>Подождите, операция выполняется локально.</p>
          </div>
        </div>
      )}
      <ProjectDialogs
        modal={modal}
        projects={projects}
        onClose={() => setModal(null)}
        onOpen={(p) =>
          run(async () => {
            if (p.id === project.id) {
              setModal(null);
              return;
            }
            if (await preserve()) resetUI(parseProject(JSON.stringify(p)));
          })
        }
        onDelete={(p) =>
          run(async () => {
            await store.save();
            await deleteProject(p.id);
            setProjects(await listProjects());
            if (p.id === project.id) resetUI(demoProject());
          })
        }
      />
    </div>
  );
}
