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
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      out.getContext("2d")!.drawImage(this.renderer.domElement, 0, 0);
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
  const r = new ImageRenderer();
  try {
    return await fn(r);
  } finally {
    r.dispose();
  }
}
export async function exportStoryboard(
  p: Project,
  kind: "zip" | "sheet",
  longEdge: number,
  progress: (s: string) => void,
) {
  if (!p.frames.length) throw new Error("Добавьте кадры в раскадровку");
  await withRenderer(async (r) => {
    const files: Record<string, Uint8Array> = {};
    const cols = 3,
      cellW = 640,
      cellH = 490;
    const sheet = document.createElement("canvas");
    // Keep the contact sheet below conservative browser canvas limits.
    const columns = p.frames.length > 60 ? 5 : cols;
    sheet.width = columns * cellW;
    sheet.height = Math.ceil(p.frames.length / columns) * cellH;
    const ctx = sheet.getContext("2d")!;
    ctx.fillStyle = "#f3f1e9";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    for (let i = 0; i < p.frames.length; i++) {
      const f = p.frames[i];
      progress(`Кадр ${i + 1} из ${p.frames.length}`);
      const canvas = await r.canvas(f.scene, kind === "sheet" ? 800 : longEdge);
      if (kind === "zip") {
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG недоступен")))),
        );
        files[`${String(i + 1).padStart(2, "0")}-${safeName(f.name)}.png`] =
          new Uint8Array(await blob.arrayBuffer());
      } else {
        const x = (i % columns) * cellW,
          y = Math.floor(i / columns) * cellH,
          s = Math.min((cellW - 32) / canvas.width, 340 / canvas.height);
        ctx.drawImage(
          canvas,
          x + (cellW - canvas.width * s) / 2,
          y + 16,
          canvas.width * s,
          canvas.height * s,
        );
        ctx.fillStyle = "#17232a";
        ctx.font = "bold 21px sans-serif";
        ctx.fillText(`${i + 1}. ${f.name}`, x + 16, y + 385, cellW - 32);
        ctx.font = "18px sans-serif";
        const text = `${f.duration} с · ${f.notes}`;
        let line = "",
          lineY = y + 416;
        for (const word of text.split(/\s+/)) {
          if (ctx.measureText(line + word).width > cellW - 32) {
            ctx.fillText(line, x + 16, lineY);
            lineY += 24;
            line = "";
            if (lineY > y + 470) break;
          }
          line += word + " ";
        }
        if (lineY <= y + 470) ctx.fillText(line, x + 16, lineY, cellW - 32);
      }
      await new Promise((res) => setTimeout(res, 0));
    }
    if (kind === "zip")
      download(
        new Blob([zipSync(files, { level: 0 }) as BlobPart]),
        safeName(p.name) + "-раскадровка.zip",
      );
    else {
      const blob = await new Promise<Blob>((res, rej) =>
        sheet.toBlob((b) =>
          b ? res(b) : rej(new Error("Лист слишком велик")),
        ),
      );
      download(blob, safeName(p.name) + "-лист.png");
    }
  });
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
