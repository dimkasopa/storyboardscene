import { z } from "zod";
import { Euler, Quaternion, MathUtils } from "three";
const n = z.number().finite().min(-10000).max(10000);
const vec = z.tuple([n, n, n]);
const id = z.string().min(1).max(100);
const name = z.string().max(200);
export const objectSchema = z.object({
  id,
  name,
  kind: z.enum(["person", "table", "chair", "sofa", "door", "wall", "cube"]),
  position: vec,
  rotation: n,
  size: vec.refine(
    (v) => v.every((x) => x >= 0.05 && x <= 100),
    "Размер от 0,05 до 100 м",
  ),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  height: z.number().min(0.5).max(3),
  pose: z.enum(["stand", "sit"]),
  arms: z.enum(["down", "raised", "front"]),
  head: z.number().min(-85).max(85),
});
export const cameraSchema = z.object({
  id,
  name,
  position: vec,
  rotation: vec,
  focal: z.number().min(10).max(200),
  format: z.enum(["16:9", "9:16", "1:1"]),
  aim: z.enum(["manual", "point", "person"]),
  targetId: z.string().nullable(),
  target: vec,
});
export const sceneSchema = z
  .object({
    objects: z.array(objectSchema).max(200),
    cameras: z.array(cameraSchema).min(1).max(50),
    activeCameraId: id,
  })
  .superRefine((s, ctx) => {
    const ids = [...s.objects, ...s.cameras].map((o) => o.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Идентификаторы объектов должны быть уникальны",
      });
    if (!s.cameras.some((c) => c.id === s.activeCameraId))
      ctx.addIssue({ code: "custom", message: "Не найдена активная камера" });
  });
const frameSchema = z.object({
  id,
  name,
  duration: z.number().min(0.1).max(300),
  notes: z.string().max(4000),
  scene: sceneSchema,
  thumbnail: z
    .string()
    .max(2000000)
    .refine(
      (s) => s === "" || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s),
    ),
});
export const projectSchema = z
  .object({
    version: z.literal(1),
    id,
    name,
    updatedAt: z.number().finite(),
    scene: sceneSchema,
    frames: z.array(frameSchema).max(100),
    animation: z.object({
      duration: z.number().min(0.5).max(120),
      easing: z.enum(["linear", "smooth"]),
      shake: z.number().min(0).max(1),
      keys: z
        .array(
          z.object({
            id,
            time: z.number().min(0).max(120),
            scene: sceneSchema,
          }),
        )
        .max(100),
    }),
  })
  .superRefine((p, ctx) => {
    for (const items of [p.frames, p.animation.keys])
      if (new Set(items.map((x) => x.id)).size !== items.length)
        ctx.addIssue({
          code: "custom",
          message: "Повторяющиеся идентификаторы кадров",
        });
    if (
      new Set(p.animation.keys.map((k) => k.time)).size !==
        p.animation.keys.length ||
      p.animation.keys.some((k) => k.time > p.animation.duration)
    )
      ctx.addIssue({
        code: "custom",
        message: "Некорректное время ключевых кадров",
      });
  });
export type SceneObject = z.infer<typeof objectSchema>;
export type ShotCamera = z.infer<typeof cameraSchema>;
export type SceneData = z.infer<typeof sceneSchema>;
export type Frame = z.infer<typeof frameSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Vec3 = [number, number, number];
export const uid = () => crypto.randomUUID();
export const clone = <T>(value: T): T => structuredClone(value);
export const labels: Record<SceneObject["kind"], string> = {
  person: "Персонаж",
  table: "Стол",
  chair: "Стул",
  sofa: "Диван",
  door: "Дверь",
  wall: "Стена",
  cube: "Куб",
};
export const aspect = (format: ShotCamera["format"]) =>
  format === "16:9" ? 16 / 9 : format === "9:16" ? 9 / 16 : 1;
export function makeObject(kind: SceneObject["kind"]): SceneObject {
  return {
    id: uid(),
    name: labels[kind],
    kind,
    position: [0, 0, 0],
    rotation: 0,
    size:
      kind === "wall"
        ? [4, 2.8, 0.15]
        : kind === "cube"
          ? [1, 1, 1]
          : [1, 1, 1],
    color:
      kind === "person" ? "#d89870" : kind === "wall" ? "#b7c0bd" : "#879a95",
    height: 1.75,
    pose: "stand",
    arms: "down",
    head: 0,
  };
}
export function makeCamera(): ShotCamera {
  return {
    id: uid(),
    name: "Новая камера",
    position: [4, 2.2, 5],
    rotation: [0, 0, 0],
    focal: 40,
    format: "16:9",
    aim: "point",
    targetId: null,
    target: [0, 1, 0],
  };
}
export function targetPoint(camera: ShotCamera, scene: SceneData): Vec3 {
  const p =
    camera.aim === "person"
      ? scene.objects.find((o) => o.id === camera.targetId)
      : undefined;
  return p
    ? [
        p.position[0],
        p.position[1] + p.height * (p.pose === "sit" ? 0.64 : 0.9),
        p.position[2],
      ]
    : camera.target;
}
export function removeEntity(scene: SceneData, entityId: string): SceneData {
  const next = clone(scene);
  next.cameras.forEach((c) => {
    if (c.targetId === entityId) {
      c.target = targetPoint(c, scene);
      c.aim = "point";
      c.targetId = null;
    }
  });
  next.objects = next.objects.filter((o) => o.id !== entityId);
  if (next.cameras.length > 1)
    next.cameras = next.cameras.filter((c) => c.id !== entityId);
  if (!next.cameras.some((c) => c.id === next.activeCameraId))
    next.activeCameraId = next.cameras[0].id;
  return next;
}
const angle = (a: number, b: number, t: number) =>
  a + (((((b - a) % 360) + 540) % 360) - 180) * t;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixVec = (a: Vec3, b: Vec3, t: number): Vec3 =>
  a.map((v, i) => mix(v, b[i], t)) as Vec3;
export function sampleAnimation(p: Project, time: number): SceneData {
  const keys = [...p.animation.keys].sort((a, b) => a.time - b.time);
  if (!keys.length) return clone(p.scene);
  if (time <= keys[0].time) return clone(keys[0].scene);
  if (time >= keys[keys.length - 1].time)
    return clone(keys[keys.length - 1].scene);
  const right = keys.findIndex((k) => k.time > time),
    a = keys[right - 1],
    b = keys[right];
  let t = (time - a.time) / (b.time - a.time);
  if (p.animation.easing === "smooth") t = t * t * (3 - 2 * t);
  const scene = clone(a.scene);
  scene.objects.forEach((o) => {
    const end = b.scene.objects.find((v) => v.id === o.id);
    if (end) {
      o.position = mixVec(o.position, end.position, t);
      o.rotation = angle(o.rotation, end.rotation, t);
      o.head = mix(o.head, end.head, t);
    }
  });
  scene.cameras.forEach((c) => {
    const end = b.scene.cameras.find((v) => v.id === c.id);
    if (end) {
      c.position = mixVec(c.position, end.position, t);
      c.target = mixVec(c.target, end.target, t);
      c.focal = mix(c.focal, end.focal, t);
      const q = (v: Vec3) =>
        new Quaternion().setFromEuler(
          new Euler(...(v.map(MathUtils.degToRad) as Vec3), "YXZ"),
        );
      const e = new Euler().setFromQuaternion(
        q(c.rotation).slerp(q(end.rotation), t),
        "YXZ",
      );
      c.rotation = [e.x, e.y, e.z].map(MathUtils.radToDeg) as Vec3;
    }
  });
  return scene;
}
export const presets = [
  "Общий",
  "На двоих",
  "Средний",
  "Крупный",
  "Левое плечо",
  "Правое плечо",
  "Со спины",
  "Сбоку",
  "Снизу",
  "Сверху",
  "Реакция",
] as const;
export function applyPreset(
  camera: ShotCamera,
  scene: SceneData,
  type: string,
  personId: string,
  foregroundId: string,
): ShotCamera {
  const p = scene.objects.find((o) => o.id === personId && o.kind === "person");
  if (!p) return camera;
  const f = scene.objects.find(
    (o) => o.id === foregroundId && o.kind === "person" && o.id !== p.id,
  );
  const c = clone(camera);
  c.aim = "person";
  c.targetId = p.id;
  c.rotation = [0, 0, 0];
  c.focal = type === "Крупный" ? 75 : 40;
  const h = p.height * (p.pose === "sit" ? 0.64 : 0.9),
    yaw = MathUtils.degToRad(p.rotation),
    front = [Math.sin(yaw), Math.cos(yaw)];
  let distance =
    type === "Крупный"
      ? 2.3 * (p.height / 1.75)
      : type === "Средний"
        ? 2.4 * (p.height / 1.75)
        : 4.5;
  distance *= Math.max(1, 1 / aspect(c.format));
  c.position = [
    p.position[0] + front[0] * distance,
    p.position[1] + h,
    p.position[2] + front[1] * distance,
  ];
  if (type === "Со спины") {
    c.position = [
      p.position[0] - front[0] * distance,
      p.position[1] + h,
      p.position[2] - front[1] * distance,
    ];
  }
  if (type === "Сбоку") {
    c.position = [
      p.position[0] + front[1] * distance,
      p.position[1] + h,
      p.position[2] - front[0] * distance,
    ];
  }
  if (type === "Снизу") c.position[1] = 0.18 + p.position[1];
  if (type === "Сверху") {
    c.position[1] = p.position[1] + p.height + 3;
    c.position[2] = p.position[2] + 0.5;
  }
  if ((type === "На двоих" || type === "Общий") && f) {
    c.aim = "point";
    c.targetId = null;
    c.target = [
      (p.position[0] + f.position[0]) / 2,
      (p.position[1] + p.height * 0.5 + f.position[1] + f.height * 0.5) / 2,
      (p.position[2] + f.position[2]) / 2,
    ];
    const gap = Math.hypot(
      p.position[0] - f.position[0],
      p.position[2] - f.position[2],
    );
    c.position = [
      c.target[0] + 1,
      c.target[1] + 1,
      c.target[2] + (gap + 4.3) * Math.max(1, 1 / aspect(c.format)),
    ];
  }
  if ((type === "Левое плечо" || type === "Правое плечо") && f) {
    const dx = p.position[0] - f.position[0],
      dz = p.position[2] - f.position[2],
      len = Math.hypot(dx, dz) || 1,
      side = type === "Левое плечо" ? -1 : 1;
    c.position = [
      f.position[0] - (dx / len) * 0.65 + (dz / len) * 0.35 * side,
      f.position[1] + f.height * (f.pose === "sit" ? 0.64 : 0.9) + 0.05,
      f.position[2] - (dz / len) * 0.65 - (dx / len) * 0.35 * side,
    ];
    c.focal = 35;
  }
  if (type === "Реакция" && f)
    return applyPreset(c, scene, "Крупный", f.id, p.id);
  return c;
}
export function demoProject(): Project {
  const a = {
    ...makeObject("person"),
    name: "Алексей",
    position: [-1, 0, 0] as Vec3,
    rotation: 55,
    color: "#c89b72",
  };
  const b = {
    ...makeObject("person"),
    name: "Мария",
    position: [1.15, 0, 0.2] as Vec3,
    rotation: -65,
    color: "#729b9a",
    height: 1.68,
    arms: "front" as const,
  };
  const table = {
    ...makeObject("table"),
    position: [0, 0, -1] as Vec3,
    color: "#b5a58b",
  };
  const scene: SceneData = {
    objects: [
      a,
      b,
      table,
      { ...makeObject("chair"), position: [0, 0, -2] as Vec3 },
      {
        ...makeObject("wall"),
        position: [0, 0, -3] as Vec3,
        size: [8, 3, 0.12] as Vec3,
      },
      { ...makeObject("door"), position: [2.6, 0, -2.88] as Vec3 },
    ],
    cameras: [],
    activeCameraId: "",
  };
  scene.cameras = ["Общий", "Средний", "Реакция", "Левое плечо", "Снизу"].map(
    (type) => ({
      ...applyPreset(makeCamera(), scene, type, a.id, b.id),
      name: type === "Левое плечо" ? "Через плечо" : type,
    }),
  );
  scene.activeCameraId = scene.cameras[0].id;
  return {
    version: 1,
    id: uid(),
    name: "Разговор в офисе",
    updatedAt: Date.now(),
    scene,
    frames: scene.cameras
      .slice(0, 3)
      .map((c, i) => ({
        id: uid(),
        name: ["Начало разговора", "Важный вопрос", "Реакция Марии"][i],
        duration: 3,
        notes: [
          "Обычный рабочий день.",
          "«А кто согласовал этот план?»",
          "Пауза. Взгляд в камеру.",
        ][i],
        thumbnail: "",
        scene: { ...clone(scene), activeCameraId: c.id },
      })),
    animation: { duration: 5, easing: "smooth", shake: 0, keys: [] },
  };
}
export function parseProject(text: string): Project {
  if (text.length > 50_000_000) throw new Error("Файл больше 50 МБ");
  const result = projectSchema.safeParse(JSON.parse(text));
  if (!result.success)
    throw new Error(
      "Некорректный проект v1: " + result.error.issues[0].message,
    );
  return result.data;
}
