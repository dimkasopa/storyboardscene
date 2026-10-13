import {
  characterLabel,
  clone,
  shotTypeLabels,
  transitionLabels,
  type Project,
  type ShotCamera,
} from "./model";
export const SHEET = {
  columns: 3,
  shotsPerPage: 6,
  cellWidth: 640,
  cellHeight: 640,
  header: 96,
  footer: 48,
  image: { x: 24, y: 60, width: 592, height: 400 },
} as const;
export function seconds(value: number) {
  return String(Number(value.toFixed(9)));
}
export function formatClock(value: number) {
  const total = Number(value.toFixed(9)),
    hours = Math.floor(total / 3600),
    minutes = Math.floor(total / 60) % 60;
  const secs = seconds(total % 60).split("."),
    tail = secs[0].padStart(2, "0") + (secs[1] ? "." + secs[1] : "");
  return (
    (hours ? String(hours).padStart(2, "0") + ":" : "") +
    String(minutes).padStart(2, "0") +
    ":" +
    tail
  );
}
export function fileSafeName(value: string) {
  return (
    value
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .trim()
      .slice(0, 90) || "кадр"
  );
}
export function timedShots(project: Project) {
  let cursor = 0;
  return project.frames.map((frame, index) => {
    const start = cursor,
      end = Number((start + frame.duration).toFixed(9));
    cursor = end;
    const camera = frame.scene.cameras.find(
      (c) => c.id === frame.scene.activeCameraId,
    )!;
    const speaker = frame.speakerId
      ? frame.scene.objects.find(
          (o) => o.id === frame.speakerId && o.kind === "person",
        )
      : undefined;
    const number = index + 1,
      formattedNumber = String(number).padStart(2, "0");
    const filename = `${formattedNumber}_${seconds(start).padStart(2, "0")}-${seconds(end).padStart(2, "0")}s_${fileSafeName(frame.name || shotTypeLabels[frame.shotType ?? ""]).replace(/\s+/g, "-")}.png`;
    return {
      frame,
      number,
      formattedNumber,
      start,
      end,
      timecode: `${formatClock(start)}–${formatClock(end)}`,
      format: camera.format,
      camera,
      speaker,
      filename,
    };
  });
}
export type TimedShot = ReturnType<typeof timedShots>[number];
export function fitImage(
  width: number,
  height: number,
  box: { x: number; y: number; width: number; height: number },
) {
  const scale = Math.min(box.width / width, box.height / height);
  return {
    x: box.x + (box.width - width * scale) / 2,
    y: box.y + (box.height - height * scale) / 2,
    width: width * scale,
    height: height * scale,
  };
}
export function sheetPages(shots: TimedShot[]) {
  return Array.from(
    { length: Math.ceil(shots.length / SHEET.shotsPerPage) },
    (_, index) => ({
      number: index + 1,
      shots: shots.slice(
        index * SHEET.shotsPerPage,
        (index + 1) * SHEET.shotsPerPage,
      ),
      width: SHEET.columns * SHEET.cellWidth,
      height:
        SHEET.header +
        Math.ceil(
          Math.min(
            SHEET.shotsPerPage,
            shots.length - index * SHEET.shotsPerPage,
          ) / SHEET.columns,
        ) *
          SHEET.cellHeight +
        SHEET.footer,
    }),
  );
}
function cameraChanges(a: ShotCamera, b: ShotCamera) {
  const same = (x: unknown, y: unknown) =>
    JSON.stringify(x) === JSON.stringify(y);
  const parts: string[] = [];
  if (!same(a.position, b.position)) parts.push("перемещение");
  if (
    !same(a.rotation, b.rotation) ||
    a.aim !== b.aim ||
    a.targetId !== b.targetId ||
    !same(a.target, b.target)
  )
    parts.push("направление / наведение");
  if (a.focal !== b.focal) parts.push("фокусное расстояние");
  return parts;
}
export function animationCameraSegments(project: Project) {
  const keys = [...project.animation.keys].sort((a, b) => a.time - b.time);
  const segments: {
    start: number;
    end: number;
    cameraId: string;
    cameraName: string;
    changes: string[];
  }[] = [];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1],
      b = keys[i];
    for (const camera of a.scene.cameras) {
      const end = b.scene.cameras.find((c) => c.id === camera.id);
      if (!end) continue;
      const changes = cameraChanges(camera, end);
      // A tracked moving actor changes the viewing direction even if the camera is static.
      if (camera.aim === "person" && camera.targetId === end.targetId) {
        const before = a.scene.objects.find((o) => o.id === camera.targetId),
          after = b.scene.objects.find((o) => o.id === camera.targetId);
        if (
          before &&
          after &&
          (JSON.stringify(before.position) !== JSON.stringify(after.position) ||
            before.height !== after.height ||
            before.pose !== after.pose) &&
          !changes.includes("направление / наведение")
        )
          changes.push("направление / наведение");
      }
      if (changes.length)
        segments.push({
          start: a.time,
          end: b.time,
          cameraId: camera.id,
          cameraName: camera.name,
          changes,
        });
    }
  }
  return segments;
}
export function shotListData(project: Project) {
  return {
    format: "director-studio-shot-list",
    version: 1,
    project: clone(project),
    readingOrder: "слева направо, сверху вниз",
    shots: timedShots(project).map((s) => ({
      number: s.number,
      frameId: s.frame.id,
      start: s.start,
      end: s.end,
      duration: s.frame.duration,
      timecode: s.timecode,
      name: s.frame.name,
      shotType: s.frame.shotType ?? "",
      format: s.format,
      speaker: s.speaker
        ? { id: s.speaker.id, name: s.speaker.name, tag: s.speaker.tag ?? "" }
        : null,
      dialogueOrNotes: s.frame.notes,
      action: s.frame.action ?? "",
      cameraMovement: s.frame.cameraMovement ?? "",
      transition: s.frame.transition ?? "",
      transitionNotes: s.frame.transitionNotes ?? "",
      filename: s.filename,
      camera: clone(s.camera),
    })),
    animation: {
      timeline:
        "Отдельная шкала времени движения; к кадрам раскадровки автоматически не привязана",
      segments: animationCameraSegments(project),
    },
  };
}
export const seedanceHelp = `Рекомендация по использованию в Seedance
Загрузите контактный лист (листы) как визуальный референс. В текстовом запросе отдельно укажите порядок кадров и их тайминг из shot-list.txt. Например: «Кадры читаются слева направо, сверху вниз. Кадр 01: 0–2 с, общий план; кадр 02: 2–5 с, крупный план. Сохраняй различия и цвета персонажей по референсам». Это пример инструкции, а не данные вашей сцены.
Листы и отдельные PNG помогают передать композицию. Модель может интерпретировать референсы по-своему: точное соблюдение каждого кадра и времени не гарантируется. Director Studio не отправляет данные в Seedance; файлы загружает пользователь вручную.
`;
export function shotListText(project: Project) {
  const lines = [
    `Director Studio · ${project.name}`,
    "Порядок чтения листов: слева направо, сверху вниз.",
    "Все интервалы раскадровки отсчитываются от 00:00.",
    "",
  ];
  for (const s of timedShots(project)) {
    const f = s.frame;
    lines.push(
      `${s.formattedNumber} · ${s.timecode} (${seconds(s.start)}–${seconds(s.end)} с)`,
      `Название: ${f.name || "не задано"}`,
      `Тип плана: ${f.shotType ? shotTypeLabels[f.shotType] : "не задано"}`,
      `Формат: ${s.format}`,
      `Говорящий персонаж: ${s.speaker ? characterLabel(s.speaker) : "не задано"}`,
      `Реплика / заметка: ${f.notes || "не задано"}`,
      `Действие / реакция: ${f.action || "не задано"}`,
      `Движение камеры: ${f.cameraMovement || "не задано"}`,
      `Переход к следующему кадру: ${f.transition ? transitionLabels[f.transition] + (f.transition === "other" && f.transitionNotes ? ": " + f.transitionNotes : "") : "не задано"}`,
      `PNG: ${s.filename}`,
      "",
    );
  }
  const segments = animationCameraSegments(project);
  if (segments.length) {
    lines.push(
      "Движение проекта — отдельная шкала времени (не привязано к кадрам автоматически):",
    );
    for (const s of segments)
      lines.push(
        `${formatClock(s.start)}–${formatClock(s.end)} · ${s.cameraName}: ${s.changes.join(", ")}`,
      );
    lines.push("");
  }
  lines.push(seedanceHelp);
  return lines.join("\n");
}
