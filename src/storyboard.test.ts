import { describe, it, expect } from "vitest";
import { Box3, Group, Mesh, MeshStandardMaterial, MathUtils } from "three";
import legacy from "../tests/fixtures/project-v1.json";
import { appearances, propKinds, propLabels } from "./catalog";
import { asset, applyTransform, disposeTree } from "./world";
import {
  clone,
  demoProject,
  emptyFrameInfo,
  makeObject,
  parseProject,
} from "./model";
import {
  timedShots,
  formatClock,
  fitImage,
  SHEET,
  sheetPages,
  shotListText,
  shotListData,
  animationCameraSegments,
} from "./storyboard";

describe("Backward-compatible project v1 additions", () => {
  it("opens a real fixture created by the previous version without changing cameras, placement or poses", () => {
    const p = parseProject(JSON.stringify(legacy));
    expect(p.version).toBe(1);
    expect(p.scene.cameras).toEqual(legacy.scene.cameras);
    for (const [index, o] of p.scene.objects.entries()) {
      expect(o).toMatchObject(legacy.scene.objects[index]);
      expect(o.appearance).toBe("base");
      expect(o.tag).toBe("");
    }
    p.frames.forEach((f, i) => {
      expect(f).toMatchObject(emptyFrameInfo);
      expect(f.scene.cameras).toEqual(legacy.frames[i].scene.cameras);
    });
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it("validates optional metadata and keeps explicit speaker, action and custom transition", () => {
    const p = demoProject();
    Object.assign(p.frames[0], {
      shotType: "shoulder",
      speakerId: p.scene.objects[1].id,
      action: "Отводит взгляд",
      cameraMovement: "Медленный наезд",
      transition: "other",
      transitionNotes: "Пауза перед склейкой",
    });
    p.scene.objects[0].appearance = "cap";
    p.scene.objects[0].tag = "А";
    expect(parseProject(JSON.stringify(p))).toEqual(p);
    for (const change of [
      (x: any) => (x.frames[0].shotType = "unrecognized"),
      (x: any) => (x.scene.objects[0].appearance = "unrecognized"),
      (x: any) => (x.scene.objects[0].tag = "x".repeat(21)),
      (x: any) => (x.scene.objects[0].prop = "unrecognized"),
    ]) {
      const invalid = clone(p);
      change(invalid);
      expect(() => parseProject(JSON.stringify(invalid))).toThrow();
    }
  });
  it("adds props as v1-compatible variants and round-trips every variant in snapshots", () => {
    const p = demoProject();
    for (const prop of propKinds) {
      const o = makeObject(prop);
      expect(o.name).toBe(propLabels[prop]);
      expect(["cube", "table", "sofa", "wall"]).toContain(o.kind);
      o.position = [1, 0.8, -2];
      o.rotation = 35;
      p.scene.objects.push(o);
    }
    p.frames[0].scene = clone(p.scene);
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
});
describe("Shot plan and contact sheet layout", () => {
  it("calculates exact cumulative times, including fractions and minute/hour rollover", () => {
    const p = demoProject();
    p.frames[0].duration = 2;
    p.frames[1].duration = 3;
    p.frames[2].duration = 0.25;
    const shots = timedShots(p);
    expect(shots.map((s) => [s.start, s.end, s.timecode])).toEqual([
      [0, 2, "00:00–00:02"],
      [2, 5, "00:02–00:05"],
      [5, 5.25, "00:05–00:05.25"],
    ]);
    p.frames[0].duration = 0.1;
    p.frames[1].duration = 0.2;
    expect(timedShots(p)[1].end).toBe(0.3);
    expect(formatClock(60)).toBe("01:00");
    expect(formatClock(3602.125)).toBe("01:00:02.125");
  });
  it("reads each frame own camera and snapshot rather than the edited current scene", () => {
    const p = demoProject();
    p.frames[1].scene.cameras.find(
      (c) => c.id === p.frames[1].scene.activeCameraId,
    )!.format = "9:16";
    const frames = clone(p.frames);
    p.scene.cameras[1].format = "1:1";
    p.scene.objects[0].color = "#ffffff";
    const shots = timedShots(p);
    expect(shots[1].format).toBe("9:16");
    expect(shots[1].frame.scene.objects[0].color).not.toBe("#ffffff");
    expect(p.frames).toEqual(frames);
  });
  it("fits landscape, portrait and square images wholly into equal cells without stretching or cropping", () => {
    for (const [w, h] of [
      [1920, 1080],
      [1080, 1920],
      [1920, 1920],
    ]) {
      const fit = fitImage(w, h, SHEET.image);
      expect(fit.width / fit.height).toBeCloseTo(w / h);
      expect(fit.x).toBeGreaterThanOrEqual(SHEET.image.x);
      expect(fit.y).toBeGreaterThanOrEqual(SHEET.image.y);
      expect(fit.x + fit.width).toBeLessThanOrEqual(
        SHEET.image.x + SHEET.image.width + 0.0001,
      );
      expect(fit.y + fit.height).toBeLessThanOrEqual(
        SHEET.image.y + SHEET.image.height + 0.0001,
      );
    }
  });
  it("keeps global numbering and reading order across bounded pages", () => {
    const p = demoProject();
    p.frames = Array.from({ length: 14 }, (_, i) => ({
      ...clone(p.frames[i % 3]),
      id: String(i),
      name: `План ${i + 1}`,
    }));
    const pages = sheetPages(timedShots(p));
    expect(pages.map((p) => p.shots.length)).toEqual([6, 6, 2]);
    expect(pages.flatMap((p) => p.shots.map((s) => s.number))).toEqual(
      Array.from({ length: 14 }, (_, i) => i + 1),
    );
    expect(pages.every((p) => p.width === 1920 && p.height <= 1424)).toBe(true);
  });
  it("exports one numbering, time range, speaker identity and file name across text and JSON", () => {
    const p = demoProject();
    p.frames[0].duration = 2;
    p.frames[1].duration = 3;
    p.frames[0].speakerId = p.scene.objects[1].id;
    p.frames[0].scene.objects[1].tag = "Б";
    const data = shotListData(p),
      text = shotListText(p);
    expect(data.shots.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(data.shots[0].speaker?.tag).toBe("Б");
    expect(text).toContain("Говорящий персонаж: Б · Мария");
    data.shots.forEach((s) => {
      expect(text).toContain(
        String(s.number).padStart(2, "0") + " · " + s.timecode,
      );
      expect(text).toContain("PNG: " + s.filename);
    });
    expect(data.shots[0].filename).toMatch(/^01_00-02s_/);
    expect(parseProject(JSON.stringify(data.project))).toEqual(p);
  });
  it("never invents dialogue, actions, transitions, speakers or per-shot camera movement", () => {
    const p = demoProject();
    p.frames.forEach((f) => {
      f.notes = "";
      Object.assign(f, emptyFrameInfo);
    });
    const text = shotListText(p),
      data = shotListData(p);
    expect(text).toContain("Реплика / заметка: не задано");
    expect(text).toContain("Действие / реакция: не задано");
    expect(text).toContain("Переход к следующему кадру: не задано");
    data.shots.forEach((s) => {
      expect(s.dialogueOrNotes).toBe("");
      expect(s.action).toBe("");
      expect(s.transition).toBe("");
      expect(s.cameraMovement).toBe("");
      expect(s.speaker).toBeNull();
    });
  });
  it("reports actual animation camera changes on a separate timeline without associating them with shots", () => {
    const p = demoProject(),
      end = clone(p.scene);
    end.cameras[0].position[0] += 2;
    end.cameras[0].focal = 60;
    p.animation.keys = [
      { id: "a", time: 0, scene: clone(p.scene) },
      { id: "b", time: 5, scene: end },
    ];
    expect(animationCameraSegments(p)[0].changes).toEqual([
      "перемещение",
      "фокусное расстояние",
    ]);
    expect(shotListData(p).shots[0].cameraMovement).toBe("");
    expect(shotListText(p)).toContain("отдельная шкала времени");
  });
});
describe("Local mannequin and prop geometry", () => {
  it("preserves color, pose, body/head orientation and source data for every appearance", () => {
    for (const appearance of appearances)
      for (const pose of ["sit", "stand"] as const) {
        const o = {
          ...makeObject("person"),
          appearance,
          pose,
          color: "#729b9a",
          head: 37,
          rotation: -65,
        };
        const before = clone(o);
        const group = new Group(),
          mesh = asset(o);
        group.add(mesh);
        applyTransform(group, o);
        group.updateMatrixWorld(true);
        const torso = mesh.children[0] as Mesh;
        expect(
          (torso.material as MeshStandardMaterial).color.getHexString(),
        ).toBe("729b9a");
        expect(mesh.getObjectByName("head")!.rotation.y).toBeCloseTo(
          MathUtils.degToRad(37),
        );
        expect(group.rotation.y).toBeCloseTo(MathUtils.degToRad(-65));
        expect(o).toEqual(before);
        expect(new Box3().setFromObject(group).isEmpty()).toBe(false);
        if (["hair", "glasses", "cap"].includes(appearance))
          expect(mesh.getObjectByName(appearance)!.parent?.name).toBe("head");
        disposeTree(group);
      }
  });
  it("makes slim and wide silhouettes distinct without altering the character color", () => {
    const person = makeObject("person"),
      slim = asset({ ...person, appearance: "slim" }),
      wide = asset({ ...person, appearance: "wide" });
    const a = new Box3().setFromObject(slim),
      b = new Box3().setFromObject(wide);
    expect(b.max.x - b.min.x).toBeGreaterThan(a.max.x - a.min.x);
    disposeTree(slim);
    disposeTree(wide);
  });
  it("creates all new props with finite practical bounds and lightweight geometry", () => {
    for (const prop of propKinds) {
      const group = asset(makeObject(prop)),
        bounds = new Box3().setFromObject(group);
      expect(bounds.isEmpty()).toBe(false);
      expect(
        [...bounds.min.toArray(), ...bounds.max.toArray()].every(
          Number.isFinite,
        ),
      ).toBe(true);
      expect(bounds.max.y).toBeLessThan(2.5);
      let count = 0;
      group.traverse((o) => {
        if (o instanceof Mesh) count++;
      });
      expect(count).toBeLessThan(30);
      disposeTree(group);
    }
  });
});
