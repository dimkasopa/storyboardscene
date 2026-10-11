import { describe, it, expect } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import {
  applyPreset,
  clone,
  demoProject,
  makeObject,
  parseProject,
  removeEntity,
  sampleAnimation,
  targetPoint,
} from "./model";
import { configureCamera } from "./world";

describe("Project data and scene snapshots", () => {
  it("round trips every demo object, camera and frame", () => {
    const p = demoProject();
    expect(parseProject(JSON.stringify(p))).toEqual(p);
    expect(p.scene.objects.filter((o) => o.kind === "person")).toHaveLength(2);
  });
  it("frame snapshots remain independent", () => {
    const p = demoProject(),
      original = clone(p.frames[0].scene);
    p.scene.objects[0].position[0] = 42;
    p.scene.cameras[0].focal = 190;
    expect(p.frames[0].scene).toEqual(original);
  });
  it("rejects malformed and unsupported projects without mutating the source", () => {
    const p = demoProject();
    for (const edit of [
      (x: any) => (x.version = 2),
      (x: any) => (x.scene.cameras = []),
      (x: any) => (x.scene.objects[0].height = -1),
      (x: any) => (x.scene.cameras[0].position = [null, 1, 2]),
      (x: any) => (x.scene.activeCameraId = "missing"),
      (x: any) => (x.scene.objects[1].id = x.scene.objects[0].id),
    ]) {
      const bad = clone(p);
      edit(bad);
      expect(() => parseProject(JSON.stringify(bad))).toThrow();
    }
    expect(p.version).toBe(1);
  });
  it("retains target point when deleting a camera subject", () => {
    const p = demoProject(),
      id = p.scene.objects[0].id,
      c = p.scene.cameras[1],
      point = targetPoint(c, p.scene);
    const next = removeEntity(p.scene, id);
    expect(next.cameras[1].aim).toBe("point");
    expect(next.cameras[1].target).toEqual(point);
    expect(next.cameras[1].targetId).toBeNull();
    const cam = new PerspectiveCamera();
    configureCamera(cam, next.cameras[1], next);
    expect(cam.quaternion.toArray().every(Number.isFinite)).toBe(true);
  });
  it("does not delete the final camera", () => {
    const p = demoProject();
    p.scene.cameras = p.scene.cameras.slice(0, 1);
    expect(removeEntity(p.scene, p.scene.cameras[0].id).cameras).toHaveLength(
      1,
    );
  });
  it("low-angle and shoulder presets respect subjects and orientation", () => {
    const p = demoProject(),
      [a, b] = p.scene.objects;
    const low = applyPreset(p.scene.cameras[0], p.scene, "Снизу", a.id, b.id);
    expect(low.position[1]).toBeCloseTo(0.18);
    expect(low.targetId).toBe(a.id);
    const left = applyPreset(low, p.scene, "Левое плечо", a.id, b.id),
      right = applyPreset(low, p.scene, "Правое плечо", a.id, b.id);
    expect(left.position).not.toEqual(right.position);
    expect(left.targetId).toBe(a.id);
  });
});
describe("Animation and projection", () => {
  it("interpolates position and lens, using shortest rotations", () => {
    const p = demoProject(),
      end = clone(p.scene);
    p.scene.objects[0].rotation = 350;
    end.objects[0].rotation = 10;
    end.objects[0].position[0] = 9;
    p.scene.cameras[0].aim = end.cameras[0].aim = "manual";
    p.scene.cameras[0].rotation = [0, 170, 0];
    end.cameras[0].rotation = [0, -170, 0];
    end.cameras[0].focal = 80;
    p.animation.keys = [
      { id: "a", time: 0, scene: clone(p.scene) },
      { id: "b", time: 4, scene: end },
    ];
    const mid = sampleAnimation(p, 2);
    expect(mid.objects[0].position[0]).toBe(4);
    expect(mid.objects[0].rotation).toBeCloseTo(360);
    expect(Math.abs(mid.cameras[0].rotation[1])).toBeCloseTo(180);
    expect(mid.cameras[0].focal).toBe(60);
    expect(sampleAnimation(p, 0)).toEqual(p.scene);
    expect(sampleAnimation(p, 4)).toEqual(end);
  });
  it("tracked cameras continue aiming at a moving character", () => {
    const p = demoProject(),
      end = clone(p.scene);
    end.objects[0].position = [4, 0, 2];
    p.animation.keys = [
      { id: "a", time: 0, scene: clone(p.scene) },
      { id: "b", time: 5, scene: end },
    ];
    const scene = sampleAnimation(p, 2.5),
      c = scene.cameras[1],
      camera = new PerspectiveCamera();
    configureCamera(camera, c, scene);
    const actual = camera.getWorldDirection(new Vector3()),
      expected = new Vector3(...targetPoint(c, scene))
        .sub(camera.position)
        .normalize();
    expect(actual.dot(expected)).toBeCloseTo(1);
  });
  it("handheld does not mutate source coordinates and is deterministic", () => {
    const p = demoProject(),
      before = clone(p.scene),
      c = new PerspectiveCamera(),
      d = new PerspectiveCamera();
    configureCamera(c, p.scene.cameras[0], p.scene, 2, 0.5);
    configureCamera(d, p.scene.cameras[0], p.scene, 2, 0.5);
    expect(c.quaternion.toArray()).toEqual(d.quaternion.toArray());
    expect(p.scene).toEqual(before);
  });
  it("separates focal length and camera translation", () => {
    const p = demoProject(),
      c = p.scene.cameras[0],
      a = new PerspectiveCamera(),
      b = new PerspectiveCamera();
    configureCamera(a, c, p.scene);
    configureCamera(b, { ...c, focal: 80 }, p.scene);
    expect(a.position.toArray()).toEqual(b.position.toArray());
    expect(a.fov).toBeGreaterThan(b.fov);
  });
  it("creates JSON-safe primitives", () => {
    expect(() => JSON.stringify(makeObject("person"))).not.toThrow();
  });
});
