import {
  cameras,
  controls,
  eraPrompt,
  situations,
  type CameraChoice,
  type ControlKey,
} from "./catalog";
import type { DirectorSettings } from "./settings";
export type Advice = {
  status: "recommended" | "suitable" | "clarify";
  reason: string;
};
export const statusLabels = {
  recommended: "Рекомендуется",
  suitable: "Подходит",
  clarify: "Требует уточнения",
};
export type Issue = {
  id: string;
  reason: string;
  solution: string;
  kind: "coverage" | "style";
};
export function issues(s: DirectorSettings): Issue[] {
  const camera = cameras.find((c) => c.id === s.camera)!;
  const result: Issue[] = [];
  if (!camera.eras.includes(s.era))
    result.push({
      id: "era",
      kind: "style",
      reason: "Это устройство не соответствует выбранной исторической эпохе.",
      solution:
        "Выберите носитель эпохи или подтвердите современную реконструкцию её внешнего вида.",
    });
  const selfRecording = s.operator === "selfie" || s.situation === "selfie";
  if (selfRecording && s.viewpoint !== "front" && s.coverage === "single")
    result.push({
      id: "selfie-view",
      kind: "coverage",
      reason:
        "Снимая себя на расстоянии руки, нельзя одновременно получить обычный кадр со спины или через плечо.",
      solution:
        "Добавьте отдельный ракурс: задняя камера телефона у второго оператора. Либо подтвердите постановочную вставку.",
    });
  if (
    s.operator === "selfie" &&
    s.camera !== "phone-front" &&
    s.camera !== "phone-rear"
  )
    result.push({
      id: "selfie-device",
      kind: "style",
      reason: "Устройство не является телефоном для обычного селфи с руки.",
      solution:
        "Выберите телефон или подтвердите постановочную имитацию селфи с отдельным оператором.",
    });
  if (s.situation === "selfie" && s.operator !== "selfie")
    result.push({
      id: "selfie-operator",
      kind: "style",
      reason: "В ситуации «селфи» выбран другой способ работы оператора.",
      solution:
        "Выберите «Герой держит телефон» или подтвердите сцену, снятую в стиле селфи другим человеком.",
    });
  if (s.operator === "selfie" && s.camera === "phone-rear")
    result.push({
      id: "rear-selfie",
      kind: "style",
      reason:
        "Задняя камера может снимать селфи, но герой не видит обычный экран перед собой.",
      solution:
        "Уточните способ контроля кадра; фронтальная камера проще. Подтверждение означает намеренное селфи без контроля экрана.",
    });
  const expected =
    camera.family === "film"
      ? "grain"
      : camera.family === "tape"
        ? "tape"
        : camera.family === "dv"
          ? "dv"
          : "clean";
  if (s.texture !== expected)
    result.push({
      id: "texture",
      kind: "style",
      reason: `Выбранная фактура не описывает обычный результат записи устройства «${camera.name}».`,
      solution:
        "Измените фактуру или подтвердите отдельную обработку изображения.",
    });
  if (
    (s.optics === "zoom" || s.optics === "portrait") &&
    s.camera === "phone-front"
  )
    result.push({
      id: "front-optics",
      kind: "style",
      reason:
        "У фронтальной камеры нельзя предполагать оптический зум или портретный объектив.",
      solution:
        "Выберите широкий угол, отдельную камеру или подтвердите цифровое приближение / имитацию узкого угла.",
    });
  if (s.focus === "shallow" && camera.family === "phone")
    result.push({
      id: "phone-focus",
      kind: "style",
      reason:
        "Сильное размытие фона у телефона зависит от оптики, расстояния и вычислительных режимов.",
      solution:
        "Выберите читаемый фон или подтвердите имитацию малой глубины резкости.",
    });
  if (s.situation === "office" && s.operator !== "observer")
    result.push({
      id: "office-operator",
      kind: "style",
      reason:
        "Этот способ съёмки меняет наблюдающий характер офисного псевдодокументального ситкома.",
      solution:
        "Выберите «Наблюдатель в офисе» или подтвердите собственную интерпретацию жанра.",
    });
  return result;
}
export function cameraAdvice(
  s: DirectorSettings,
  camera: CameraChoice,
): Advice {
  const candidate = { ...s, camera: camera.id };
  const problem = issues(candidate).find((i) =>
    [
      "era",
      "selfie-device",
      "rear-selfie",
      "texture",
      "front-optics",
      "phone-focus",
    ].includes(i.id),
  );
  const confirmed = s.intentional && camera.id === s.camera;
  if (problem && !confirmed)
    return {
      status: "clarify",
      reason: problem.reason + " " + problem.solution,
    };
  const situation = situations.find((x) => x.id === s.situation)!;
  if (situation.recommended.includes(camera.id))
    return {
      status: "recommended",
      reason:
        confirmed && problem
          ? "Основной вариант для ситуации; художественное отклонение подтверждено."
          : `Поддерживает замысел «${situation.label}» и выбранный способ записи.`,
    };
  if (situation.suitable.includes(camera.id))
    return {
      status: "suitable",
      reason:
        "Позволяет снять эту ситуацию; поведение оператора и фактура выбираются отдельно.",
    };
  return {
    status: "suitable",
    reason:
      "Альтернативный способ съёмки. Он изменит ощущение ситуации; название устройства само по себе не задаёт результат.",
  };
}
export function optionAdvice(
  s: DirectorSettings,
  key: ControlKey,
  value: string,
): Advice {
  const related: Record<ControlKey, string[]> = {
    operator: [
      "selfie-view",
      "selfie-device",
      "selfie-operator",
      "rear-selfie",
      "office-operator",
    ],
    optics: ["front-optics"],
    focus: ["phone-focus"],
    color: [],
    texture: ["texture"],
  };
  const problem = issues({ ...s, [key]: value }).find((i) =>
    related[key].includes(i.id),
  );
  if (problem && !(s.intentional && value === s[key]))
    return { status: "clarify", reason: problem.reason };
  const camera = cameras.find((c) => c.id === s.camera)!;
  const best =
    key === "texture"
      ? camera.family === "film"
        ? "grain"
        : camera.family === "tape"
          ? "tape"
          : camera.family === "dv"
            ? "dv"
            : "clean"
      : key === "operator"
        ? situations.find((x) => x.id === s.situation)!.defaults.operator
        : key === "optics"
          ? s.situation === "office"
            ? "zoom"
            : s.situation === "selfie"
              ? "wide"
              : "normal"
          : key === "focus"
            ? camera.family === "phone"
              ? "auto"
              : "deep"
            : camera.family === "tape"
              ? "video"
              : camera.family === "film"
                ? "warm-film"
                : "natural";
  const choice = controls[key].find((c) => c.id === value)!;
  return {
    status: value === best ? "recommended" : "suitable",
    reason: choice.effect,
  };
}
export function styleCameraPrompt(s: DirectorSettings): string {
  const camera = cameras.find((c) => c.id === s.camera)!;
  const situation = situations.find((x) => x.id === s.situation)!;
  const found = issues(s);
  const choice = (key: ControlKey) =>
    controls[key].find((x) => x.id === s[key])!.prompt;
  const era =
    s.era === "present"
      ? "Contemporary production."
      : !camera.eras.includes(s.era)
        ? `Contemporary production ${s.intentional ? "deliberately styled as" : "requesting the look of"} ${eraPrompt[s.era]} footage.`
        : `${eraPrompt[s.era]} shooting register.`;
  const style = `STYLE: ${situation.prompt}. ${era} ${choice("color")}; ${choice("texture")}.`;
  const mainSelfie = s.operator === "selfie";
  const reverse =
    (mainSelfie || s.situation === "selfie") && s.viewpoint !== "front";
  const stagedSelfie =
    s.intentional &&
    found.some((i) => ["selfie-device", "selfie-operator"].includes(i.id));
  const operator = stagedSelfie
    ? "a separate operator staging a selfie-like perspective"
    : s.operator === "observer" && s.optics === "zoom"
      ? "observational handheld coverage with subtle natural sway"
      : choice("operator");
  const optics =
    s.intentional &&
    s.camera === "phone-front" &&
    ["zoom", "portrait"].includes(s.optics)
      ? s.optics === "zoom"
        ? "a brief digital crop-in toward a reaction"
        : "a digitally cropped narrow portrait framing"
      : choice("optics");
  const focus =
    s.intentional && s.focus === "shallow" && camera.family === "phone"
      ? "computationally simulated background blur, keeping the subject sharp"
      : choice("focus");
  const view =
    s.viewpoint === "front" || reverse
      ? "front-facing view of the subject"
      : s.viewpoint === "back"
        ? "view from behind the subject"
        : "over-the-shoulder view of the subject";
  const cameraLine = `CAMERA: ${camera.prompt}; ${operator}; ${optics}; ${focus}; ${view}.`;
  const extras: string[] = [];
  if (s.intentional && found.some((i) => i.id === "texture"))
    extras.push(
      "The selected texture is intentional post-processing, not the camera's native recording medium.",
    );
  if (s.intentional && found.some((i) => i.id === "rear-selfie"))
    extras.push(
      "The subject self-records with the rear camera without monitoring the normal front screen.",
    );
  if (reverse) {
    const label =
      s.viewpoint === "back" ? "rear view" : "over-the-shoulder view";
    if (s.coverage === "second-camera")
      extras.push(
        `For the ${label}, use a separate rear-phone camera held by a second operator as an additional angle; do not describe it as the same continuous selfie shot.`,
      );
    else if (s.intentional)
      extras.push(
        `The ${label} is a deliberately staged insert filmed by a separate operator, distinct from the self-recorded shot.`,
      );
    else
      extras.push(
        `[Clarify: the ${label} requires a separate camera angle; a continuous arm's-length selfie cannot show this viewpoint.]`,
      );
  }
  if (!reverse && s.coverage === "second-camera")
    extras.push(
      "Additional coverage: a second operator records a separate angle with a rear-facing phone camera.",
    );
  return [style, cameraLine, ...extras].join("\n");
}
// Only a camera explicitly aimed at a known person gives a reliable subject context.
export function sceneViewpoint(
  scene: import("../model").SceneData,
): { name: string; viewpoint: "front" | "back" | null } | null {
  const c = scene.cameras.find((c) => c.id === scene.activeCameraId)!;
  if (c.aim !== "person") return null;
  const p = scene.objects.find(
    (p) => p.id === c.targetId && p.kind === "person",
  );
  if (!p) return null;
  const dx = c.position[0] - p.position[0],
    dz = c.position[2] - p.position[2];
  const length = Math.hypot(dx, dz);
  if (length < 0.01) return null;
  const yaw = (p.rotation * Math.PI) / 180;
  const dot = (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / length;
  return {
    name: p.name,
    viewpoint: dot > 0.5 ? "front" : dot < -0.5 ? "back" : null,
  };
}
