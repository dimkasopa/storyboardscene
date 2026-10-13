import {
  SHEET,
  fitImage,
  timedShots,
  sheetPages,
  shotListData,
  shotListText,
  seedanceHelp,
  seconds,
  type TimedShot,
} from "./storyboard";
import { characterLabel, shotTypeLabels } from "./model";
import * as THREE from "three";
import { zipSync, strToU8 } from "fflate";
import {
  addEnvironment,
  asset,
  applyTransform,
  configureCamera,
  disposeTree,
} from "./world";
import { aspect, sampleAnimation, type SceneData, type Project } from "./model";
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const safeName = (s: string) =>
  s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 90) || "кадр";
export function dimensions(
  scene: SceneData,
  longEdge = 1920,
): [number, number] {
  const c = scene.cameras.find((c) => c.id === scene.activeCameraId)!;
  const a = aspect(c.format);
  return a >= 1
    ? [longEdge, Math.round(longEdge / a)]
    : [Math.round(longEdge * a), longEdge];
}
export class ImageRenderer {
  renderer: THREE.WebGLRenderer;
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
  }
  async canvas(
    data: SceneData,
    longEdge = 1920,
    time = 0,
    shake = 0,
  ): Promise<HTMLCanvasElement> {
    const [w, h] = dimensions(data, longEdge);
    this.renderer.setSize(w, h, false);
    const scene = new THREE.Scene();
    addEnvironment(scene);
    data.objects.forEach((o) => {
      const wrapper = new THREE.Group();
      wrapper.add(asset(o));
      applyTransform(wrapper, o);
      scene.add(wrapper);
    });
    const camera = new THREE.PerspectiveCamera();
    configureCamera(
      camera,
      data.cameras.find((c) => c.id === data.activeCameraId)!,
      data,
      time,
      shake,
    );
    try {
      await this.renderer.compileAsync(scene, camera);
      this.renderer.render(scene, camera);
      if (this.renderer.getContext().isContextLost())
        throw new Error(
          "3D-контекст потерян. Перезагрузите страницу и повторите экспорт.",
        );
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const context = out.getContext("2d");
      if (!context)
        throw new Error("Недостаточно памяти для PNG. Уменьшите разрешение.");
      context.drawImage(this.renderer.domElement, 0, 0);
      return out;
    } finally {
      disposeTree(scene);
    }
  }
  async blob(scene: SceneData, longEdge = 1920, time = 0, shake = 0) {
    const canvas = await this.canvas(scene, longEdge, time, shake);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Не удалось создать PNG"))),
        "image/png",
      ),
    );
  }
  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
export async function withRenderer<T>(fn: (r: ImageRenderer) => Promise<T>) {
  let r: ImageRenderer;
  try {
    r = new ImageRenderer();
  } catch {
    throw new Error(
      "Не удалось подготовить 3D-экспорт. Проверьте WebGL и аппаратное ускорение браузера.",
    );
  }
  try {
    return await fn(r);
  } finally {
    r.dispose();
  }
}
export type SheetOptions = { characterLabels?: boolean };
export async function pngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error(
                "Не удалось создать PNG. Уменьшите разрешение и повторите экспорт.",
              ),
            ),
      "image/png",
    ),
  );
}
function shortLine(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  while (text && ctx.measureText(text + "…").width > width)
    text = text.slice(0, -1);
  return text + "…";
}
function wrapCaption(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  maxLines: number,
) {
  // Fixed font sizes; never horizontally scale long text into unreadable glyphs.
  const lines: string[] = [];
  let line = "";
  for (const char of text.replace(/\s+/g, " ").trim()) {
    if (ctx.measureText(line + char).width > width) {
      lines.push(line.trimEnd());
      line = "";
    }
    line += char;
  }
  if (line) lines.push(line.trim());
  const result = lines.slice(0, maxLines);
  if (lines.length > maxLines)
    result[maxLines - 1] = shortLine(ctx, result[maxLines - 1] + "…", width);
  return result;
}
function newSheet(
  project: Project,
  page: ReturnType<typeof sheetPages>[number],
  pageCount: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = page.width;
  canvas.height = page.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Недостаточно памяти для листа раскадровки.");
  ctx.fillStyle = "#f1f0e9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#24313a";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(shortLine(ctx, project.name, canvas.width - 440), 24, 41);
  ctx.font = "22px sans-serif";
  ctx.fillText("Порядок чтения: слева направо, сверху вниз", 24, 75);
  ctx.textAlign = "right";
  ctx.fillText(
    `Лист ${String(page.number).padStart(2, "0")} / ${pageCount}`,
    canvas.width - 24,
    41,
  );
  ctx.textAlign = "left";
  ctx.fillStyle = "#65706e";
  ctx.font = "18px sans-serif";
  ctx.fillText(
    "Director Studio · отдельные PNG и полный текстовый план сохраняют детали каждого кадра",
    24,
    canvas.height - 18,
  );
  return canvas;
}
function drawSheetCard(
  sheet: HTMLCanvasElement,
  image: HTMLCanvasElement,
  shot: TimedShot,
  index: number,
  options: SheetOptions,
) {
  const ctx = sheet.getContext("2d")!,
    x = (index % SHEET.columns) * SHEET.cellWidth,
    y = SHEET.header + Math.floor(index / SHEET.columns) * SHEET.cellHeight;
  ctx.fillStyle = "#fafaf5";
  ctx.fillRect(x + 12, y + 6, SHEET.cellWidth - 24, SHEET.cellHeight - 16);
  ctx.strokeStyle = "#d2d6ce";
  ctx.strokeRect(x + 12, y + 6, SHEET.cellWidth - 24, SHEET.cellHeight - 16);
  ctx.fillStyle = "#25353b";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(
    `${shot.formattedNumber} · ${seconds(shot.start)}–${seconds(shot.end)} с`,
    x + 24,
    y + 39,
  );
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(shot.format, x + SHEET.cellWidth - 24, y + 38);
  ctx.textAlign = "left";
  const box = { ...SHEET.image, x: x + SHEET.image.x, y: y + SHEET.image.y };
  ctx.fillStyle = "#d7dad4";
  ctx.fillRect(box.x, box.y, box.width, box.height);
  const fit = fitImage(image.width, image.height, box);
  ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height);
  ctx.fillStyle = "#24313a";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(
    shortLine(
      ctx,
      [
        shot.frame.shotType ? shotTypeLabels[shot.frame.shotType] : "",
        shot.frame.name,
      ]
        .filter(Boolean)
        .join(" · ") || "Название не задано",
      SHEET.image.width,
    ),
    x + 24,
    y + 497,
  );
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#485955";
  const caption = [shot.frame.action, shot.frame.notes]
    .filter(Boolean)
    .join(" · ");
  wrapCaption(ctx, caption, SHEET.image.width, 2).forEach((line, i) =>
    ctx.fillText(line, x + 24, y + 533 + i * 28),
  );
  if (options.characterLabels) {
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#586862";
    const people = shot.frame.scene.objects
      .filter((o) => o.kind === "person")
      .map(characterLabel)
      .join("; ");
    if (people)
      ctx.fillText(
        shortLine(ctx, "В сцене: " + people, SHEET.image.width),
        x + 24,
        y + 604,
      );
  }
}
async function storyboardFiles(
  project: Project,
  mode: "zip" | "sheet" | "seedance",
  longEdge: number,
  progress: (s: string) => void,
  options: SheetOptions,
) {
  if (!project.frames.length) throw new Error("Добавьте кадры в раскадровку");
  const files: Record<string, Uint8Array> = {},
    shots = timedShots(project),
    pages = sheetPages(shots);
  await withRenderer(async (r) => {
    for (const page of pages) {
      const sheet =
        mode === "zip" ? null : newSheet(project, page, pages.length);
      for (const [index, shot] of page.shots.entries()) {
        progress(
          `Кадр ${shot.number} из ${shots.length} · лист ${page.number} / ${pages.length}`,
        );
        const image = await r.canvas(
          shot.frame.scene,
          mode === "sheet" ? 800 : longEdge,
        );
        if (mode !== "sheet") {
          const name =
            mode === "seedance"
              ? shot.filename
              : `${shot.formattedNumber}-${safeName(shot.frame.name)}.png`;
          files[name] = new Uint8Array(
            await (await pngBlob(image)).arrayBuffer(),
          );
        }
        if (sheet) drawSheetCard(sheet, image, shot, index, options);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (sheet)
        files[`storyboard-${String(page.number).padStart(2, "0")}.png`] =
          new Uint8Array(await (await pngBlob(sheet)).arrayBuffer());
    }
  });
  return files;
}
export async function exportStoryboard(
  project: Project,
  kind: "zip" | "sheet",
  longEdge: number,
  progress: (s: string) => void,
  options: SheetOptions = {},
) {
  const files = await storyboardFiles(
    project,
    kind,
    longEdge,
    progress,
    options,
  );
  if (kind === "sheet" && Object.keys(files).length === 1)
    download(
      new Blob([Object.values(files)[0] as BlobPart], { type: "image/png" }),
      safeName(project.name) + "-лист.png",
    );
  else
    download(
      new Blob([zipSync(files, { level: 0 }) as BlobPart], {
        type: "application/zip",
      }),
      safeName(project.name) +
        (kind === "sheet" ? "-листы.zip" : "-раскадровка.zip"),
    );
}
export async function exportSeedance(
  project: Project,
  longEdge: number,
  progress: (s: string) => void,
  options: SheetOptions = {},
) {
  const files = await storyboardFiles(
    project,
    "seedance",
    longEdge,
    progress,
    options,
  );
  files["shot-list.txt"] = strToU8(shotListText(project));
  files["shot-list.json"] = strToU8(
    JSON.stringify(shotListData(project), null, 2),
  );
  files["README.txt"] = strToU8(
    seedanceHelp +
      "\nОдин лист содержит до 6 кадров. Листы нумеруются в общем порядке; нумерация кадров между страницами продолжается.\nshot-list.json содержит полный проект v1 в поле project и структурированный план. Для резервной копии, которую можно импортировать напрямую, используйте обычный экспорт «Проект · JSON».\n",
  );
  progress("Собираю ZIP для Seedance…");
  download(
    new Blob([zipSync(files, { level: 0 }) as BlobPart], {
      type: "application/zip",
    }),
    safeName(project.name) + "-Seedance.zip",
  );
}
export async function exportAnimation(
  p: Project,
  fps: number,
  longEdge: number,
  progress: (s: string) => void,
) {
  if (p.animation.keys.length < 2)
    throw new Error("Для движения нужны минимум два ключевых кадра");
  const count = Math.ceil(p.animation.duration * fps) + 1;
  if (count > 241)
    throw new Error(
      "Не более 241 PNG за экспорт. Уменьшите длительность или частоту кадров.",
    );
  await withRenderer(async (r) => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < count; i++) {
      const time = Math.min(i / fps, p.animation.duration);
      progress(`PNG ${i + 1} / ${count}`);
      const blob = await r.blob(
        sampleAnimation(p, time),
        longEdge,
        time,
        p.animation.shake,
      );
      files[`frame-${String(i).padStart(4, "0")}.png`] = new Uint8Array(
        await blob.arrayBuffer(),
      );
      await new Promise((res) => setTimeout(res, 0));
    }
    files["README.txt"] = strToU8(
      `Director Studio\n${fps} fps; ${p.animation.duration} seconds. Last image is the endpoint.\nPNG sequence, no video or audio encoding.\n`,
    );
    download(
      new Blob([zipSync(files, { level: 0 }) as BlobPart]),
      safeName(p.name) + "-движение.zip",
    );
  });
}
