import { Trash2, X } from "lucide-react";
import type { Project } from "../model";
type Props = {
  modal: "projects" | "help" | null;
  projects: Project[];
  onClose: () => void;
  onOpen: (p: Project) => void;
  onDelete: (p: Project) => void;
};
export function ProjectDialogs({
  modal,
  projects,
  onClose,
  onOpen,
  onDelete,
}: Props) {
  return (
    <>
      {" "}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal === "projects" ? "Локальные проекты" : "Помощь"}
          >
            <div className="modal-heading">
              <h2>
                {modal === "projects"
                  ? "Ваши проекты"
                  : "Добро пожаловать в мастерскую"}
              </h2>
              <button aria-label="Закрыть" onClick={() => onClose()}>
                <X size={20} />
              </button>
            </div>
            {modal === "projects" ? (
              <>
                <p className="hint">
                  Проекты доступны только в этом браузере. Для переноса
                  используйте JSON.
                </p>
                {projects.length ? (
                  projects.map((p) => (
                    <div className="project-row" key={p.id}>
                      <div>
                        <strong>{p.name}</strong>
                        <small>
                          {new Date(p.updatedAt).toLocaleString("ru-RU")} ·{" "}
                          {p.frames.length} кадров
                        </small>
                      </div>
                      <button onClick={() => onOpen(p)}>Открыть</button>
                      <button
                        aria-label={`Удалить проект ${p.name}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Удалить «${p.name}» из браузера? Это нельзя отменить. Скачайте JSON для резервной копии.`,
                            )
                          )
                            onDelete(p);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p>Пока нет сохранённых проектов.</p>
                )}
              </>
            ) : (
              <div className="help-content">
                <p>
                  Director Studio помогает найти композицию и собрать визуальный
                  референс. Все сцены и файлы остаются на вашем устройстве.
                </p>
                <ol>
                  <li>
                    <strong>Расставьте героев.</strong> Выберите объект слева
                    или прямо в сцене. Стрелки двигают, дуги поворачивают.
                    Точные значения доступны справа.
                  </li>
                  <li>
                    <strong>Поставьте камеру.</strong> Обзор сцены независим от
                    съёмочного ракурса. Выберите камеру, настройте высоту,
                    объектив и наведение или нажмите «Войти в камеру».
                  </li>
                  <li>
                    <strong>Сохраните кадр.</strong> Он запоминает всю сцену.
                    Чтобы изменить уже сохранённый кадр, нажмите «Обновить кадр
                    текущей сценой».
                  </li>
                  <li>
                    <strong>Добавьте движение.</strong> Сохраните ключ при 0 с,
                    переместите время, нажмите «Редактировать этот момент»,
                    измените сцену и добавьте второй ключ.
                  </li>
                  <li>
                    <strong>Экспортируйте.</strong> PNG — текущий ракурс, ZIP —
                    отдельные кадры, PNG-лист — вся раскадровка, JSON —
                    переносимая резервная копия.
                  </li>
                </ol>
                <div className="shortcut-grid">
                  <span>Перемещение / поворот</span>
                  <kbd>G / R</kbd>
                  <span>Удалить объект</span>
                  <kbd>Delete</kbd>
                  <span>Дублировать</span>
                  <kbd>Ctrl D</kbd>
                  <span>Отменить / повторить</span>
                  <kbd>Ctrl Z / Ctrl Shift Z</kbd>
                  <span>Внутри камеры</span>
                  <kbd>WASD + Q / E</kbd>
                  <span>Выйти из камеры</span>
                  <kbd>Esc</kbd>
                </div>
                <p className="hint">
                  Движение — простой блокинг без анимации ходьбы. Экспорт
                  анимации: PNG-последовательность, до 241 кадра за раз. Для
                  полноценной работы используйте компьютер с WebGL 2 и
                  актуальный Chrome или Edge.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
