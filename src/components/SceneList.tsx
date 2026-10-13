import { useRef, useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronLeft,
  Plus,
  UserRound,
  Video,
} from "lucide-react";
import { characterLabel, type SceneData, type AddObjectKind } from "../model";
import { objectCategories } from "../catalog";
import { useDismiss } from "../useDismiss";
type Props = {
  scene: SceneData;
  selected: string | null;
  disabled: boolean;
  onClose: () => void;
  select: (id: string | null) => void;
  addObject: (kind: AddObjectKind) => void;
  addCamera: (fromView?: boolean) => void;
};
export function SceneList({
  scene,
  selected,
  disabled,
  onClose,
  select,
  addObject,
  addCamera,
}: Props) {
  const [addMenu, setAddMenu] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useDismiss(menu, addMenu, () => setAddMenu(false));
  const people = scene.objects.filter((o) => o.kind === "person");
  return (
    <aside className={`scene-list ${disabled ? "locked" : ""}`}>
      <div className="panel-title">
        <span>СЦЕНА</span>
        <button title="Свернуть список" onClick={onClose}>
          <ChevronLeft size={14} />
        </button>
      </div>
      <div className="menu-anchor add-object" ref={menu}>
        <button className="wide" onClick={() => setAddMenu(!addMenu)}>
          <Plus size={15} /> Добавить объект <ChevronDown size={13} />
        </button>
        {addMenu && (
          <div className="dropdown">
            {objectCategories.map((category) => (
              <section key={category.name} className="object-category">
                <h4>{category.name}</h4>
                {category.items.map((item) => (
                  <button
                    key={item.kind}
                    onClick={() => {
                      addObject(item.kind);
                      setAddMenu(false);
                    }}
                  >
                    {item.kind === "person" ? (
                      <UserRound size={15} />
                    ) : (
                      <Box size={15} />
                    )}{" "}
                    {item.name}
                  </button>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
      <div className="list-scroll">
        <h4>
          ПЕРСОНАЖИ <span>{people.length}</span>
        </h4>
        {scene.objects
          .filter((o) => o.kind === "person")
          .map((o) => (
            <button
              className={`entity ${selected === o.id ? "selected" : ""}`}
              key={o.id}
              onClick={() => select(o.id)}
            >
              <UserRound size={15} />
              <span>{characterLabel(o)}</span>
              <i style={{ background: o.color }} />
            </button>
          ))}
        <h4>
          ОКРУЖЕНИЕ <span>{scene.objects.length - people.length}</span>
        </h4>
        {scene.objects
          .filter((o) => o.kind !== "person")
          .map((o) => (
            <button
              className={`entity ${selected === o.id ? "selected" : ""}`}
              key={o.id}
              onClick={() => select(o.id)}
            >
              <Box size={14} />
              <span>{o.name}</span>
            </button>
          ))}
        <h4>
          КАМЕРЫ{" "}
          <button
            title="Добавить камеру"
            aria-label="Добавить камеру"
            onClick={() => addCamera()}
          >
            <Plus size={13} />
          </button>
        </h4>
        {scene.cameras.map((c, i) => (
          <button
            className={`entity ${selected === c.id ? "selected" : ""}`}
            key={c.id}
            onClick={() => select(c.id)}
          >
            <Video size={15} />
            <span>{c.name}</span>
            {scene.activeCameraId === c.id ? (
              <span className="live-dot" />
            ) : (
              <small>{String(i + 1).padStart(2, "0")}</small>
            )}
          </button>
        ))}
        <button className="text-button" onClick={() => addCamera(true)}>
          <Plus size={13} /> Камера из текущего вида
        </button>
      </div>
      <div className="local-note">
        <span className="live-dot" /> Только на вашем устройстве
        <p>
          Проекты хранятся в этом браузере. Скачивайте JSON для резервной копии.
        </p>
      </div>
    </aside>
  );
}
