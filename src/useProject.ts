import { useCallback, useEffect, useRef, useState } from "react";
import { clone, demoProject, type Project } from "./model";
import { loadLast, saveProject } from "./storage";
export function useProject() {
  const [project, setProject] = useState<Project>(demoProject),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState("Загрузка…");
  const ref = useRef(project),
    past = useRef<Project[]>([]),
    future = useRef<Project[]>([]),
    base = useRef<Project | null>(null),
    dirty = useRef(false),
    queue = useRef(Promise.resolve());
  const [revision, setRevision] = useState(0);
  const replace = useCallback((p: Project) => {
    ref.current = p;
    setProject(p);
    dirty.current = true;
    setStatus("Есть изменения");
    setRevision((r) => r + 1);
  }, []);
  const commit = useCallback(
    (fn: (p: Project) => void) => {
      const next = clone(ref.current);
      fn(next);
      next.updatedAt = Date.now();
      past.current.push(ref.current);
      if (past.current.length > 40) past.current.shift();
      future.current = [];
      replace(next);
    },
    [replace],
  );
  const live = useCallback(
    (fn: (p: Project) => void) => {
      const next = clone(ref.current);
      fn(next);
      next.updatedAt = Date.now();
      replace(next);
    },
    [replace],
  );
  const begin = useCallback(() => {
    if (!base.current) base.current = clone(ref.current);
  }, []);
  const end = useCallback(() => {
    if (base.current) {
      past.current.push(base.current);
      if (past.current.length > 40) past.current.shift();
      base.current = null;
      future.current = [];
      setRevision((r) => r + 1);
    }
  }, []);
  const undo = useCallback(() => {
    const p = past.current.pop();
    if (p) {
      future.current.push(ref.current);
      replace(p);
    }
  }, [replace]);
  const redo = useCallback(() => {
    const p = future.current.pop();
    if (p) {
      past.current.push(ref.current);
      replace(p);
    }
  }, [replace]);
  const open = useCallback(
    (p: Project) => {
      past.current = [];
      future.current = [];
      base.current = null;
      replace(p);
    },
    [replace],
  );
  const save = useCallback(async () => {
    const source = ref.current;
    const value = clone(source);
    setStatus("Сохраняю…");
    const job = queue.current.catch(() => {}).then(() => saveProject(value));
    queue.current = job;
    try {
      await job;
      if (ref.current === source) {
        dirty.current = false;
        setStatus("Сохранено в браузере");
      }
    } catch {
      setStatus(
        "Не удалось сохранить: проверьте место в браузере. Скачайте JSON.",
      );
      throw new Error("Ошибка IndexedDB: скачайте резервную копию JSON");
    }
  }, []);
  useEffect(() => {
    let active = true;
    loadLast()
      .then((p) => {
        if (active) {
          if (p) {
            ref.current = p;
            setProject(p);
          }
          setReady(true);
          setStatus("Сохранено в браузере");
        }
      })
      .catch(() => {
        if (active) {
          setReady(true);
          setStatus("Хранилище недоступно. Используйте JSON.");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [project, ready, save]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  return {
    project,
    ref,
    ready,
    status,
    commit,
    live,
    begin,
    end,
    undo,
    redo,
    open,
    save,
    dirty,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    revision,
  };
}
