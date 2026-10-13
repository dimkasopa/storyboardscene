import { describe, expect, it } from "vitest";
import { cameras, controls, situationDefaults } from "./catalog";
import {
  cameraAdvice,
  issues,
  optionAdvice,
  sceneViewpoint,
  styleCameraPrompt,
} from "./logic";
import { defaultDirector, directorSchema } from "./settings";
import { clone, demoProject, parseProject } from "../model";
import { shotListData } from "../storyboard";

const cases = [
  {
    situation: "selfie",
    camera: "phone-front",
    operator: "selfie",
    optics: "wide",
    focus: "auto",
    color: "natural",
    texture: "clean",
    phrase: "arm's-length self-recording",
  },
  {
    situation: "friend",
    camera: "phone-rear",
    operator: "friend",
    optics: "normal",
    focus: "auto",
    color: "natural",
    texture: "clean",
    phrase: "slightly delayed reframing",
  },
  {
    situation: "office",
    camera: "digital-zoom",
    operator: "observer",
    optics: "zoom",
    focus: "deep",
    color: "natural",
    texture: "clean",
    phrase: "short reactive zoom-in",
  },
  {
    situation: "home",
    camera: "vhs",
    operator: "home",
    optics: "normal",
    focus: "deep",
    color: "video",
    texture: "tape",
    phrase: "1980s shooting register",
  },
] as const;
describe("Director shooting registers", () => {
  it.each(cases)(
    "$situation yields compatible settings and a descriptive fragment",
    (c) => {
      const s = situationDefaults(c.situation);
      for (const key of [
        "camera",
        "operator",
        "optics",
        "focus",
        "color",
        "texture",
      ] as const)
        expect(s[key]).toBe(c[key]);
      expect(issues(s)).toEqual([]);
      expect(
        cameraAdvice(s, cameras.find((x) => x.id === s.camera)!),
      ).toMatchObject({ status: "recommended" });
      const prompt = styleCameraPrompt(s);
      expect(prompt).toContain("STYLE:");
      expect(prompt).toContain("CAMERA:");
      expect(prompt).toContain(c.phrase);
      for (const key of ["focus", "color", "texture"] as const)
        expect(prompt).toContain(
          controls[key].find((x) => x.id === s[key])!.prompt,
        );
      expect(prompt).not.toMatch(/cinematic|4K|beautiful/);
    },
  );
  it("requests a separate reverse angle for selfie and keeps that solution explicit", () => {
    const s = { ...situationDefaults("selfie"), viewpoint: "back" as const };
    expect(issues(s).map((x) => x.id)).toContain("selfie-view");
    expect(styleCameraPrompt(s)).toContain("[Clarify:");
    const resolved = { ...s, coverage: "second-camera" as const };
    expect(issues(resolved)).toEqual([]);
    expect(styleCameraPrompt(resolved)).toContain("second operator");
    expect(styleCameraPrompt(resolved)).not.toContain("[Clarify:");
    const staged = styleCameraPrompt({ ...s, intentional: true });
    expect(staged).toContain("deliberately staged insert");
    expect(staged).not.toContain("[Clarify:");
  });
  it("allows deliberate modern reconstruction without claiming a phone existed in the 1980s", () => {
    const s = { ...situationDefaults("home"), camera: "phone-rear" as const };
    expect(issues(s).map((x) => x.id)).toEqual(["era", "texture"]);
    expect(cameraAdvice(s, cameras[1]).status).toBe("clarify");
    const accepted = { ...s, intentional: true };
    expect(cameraAdvice(accepted, cameras[1]).status).toBe("suitable");
    expect(styleCameraPrompt(accepted)).toContain(
      "Contemporary production deliberately styled as 1980s footage",
    );
    expect(styleCameraPrompt(accepted)).toContain(
      "intentional post-processing",
    );
  });
  it("separates film, analog tape, DV and phone optics instead of fabricating device specs", () => {
    expect(optionAdvice(defaultDirector, "texture", "grain").status).toBe(
      "clarify",
    );
    expect(
      optionAdvice(
        { ...defaultDirector, camera: "minidv", texture: "dv" },
        "texture",
        "dv",
      ).status,
    ).toBe("recommended");
    const s = {
      ...situationDefaults("selfie"),
      optics: "portrait" as const,
      focus: "shallow" as const,
      intentional: true,
    };
    expect(styleCameraPrompt(s)).toContain("digitally cropped");
    expect(styleCameraPrompt(s)).toContain("computationally simulated");
    expect(cameras).toHaveLength(8);
    expect(new Set(cameras.map((c) => c.id)).size).toBe(8);
    for (const c of cameras) expect(c.sources.length).toBeGreaterThan(0);
  });
  it("uses one reactive zoom for mockumentary rather than stacking camera movements", () => {
    const text = styleCameraPrompt(situationDefaults("office"));
    expect(text.match(/reactive zoom/g)).toHaveLength(1);
    expect(text).not.toContain("reactive reframing");
  });
  it("recognizes a targeted person's back, but never invents an unknown subject", () => {
    const scene = demoProject().scene,
      actor = scene.objects.find((o) => o.kind === "person")!;
    actor.rotation = 0;
    const camera = scene.cameras.find((c) => c.id === scene.activeCameraId)!;
    camera.aim = "person";
    camera.targetId = actor.id;
    camera.position = [actor.position[0], 1.6, actor.position[2] - 2];
    expect(sceneViewpoint(scene)).toEqual({
      name: actor.name,
      viewpoint: "back",
    });
    actor.rotation = 180;
    expect(sceneViewpoint(scene)?.viewpoint).toBe("front");
    camera.aim = "point";
    expect(sceneViewpoint(scene)).toBeNull();
  });
  it("keeps legacy project data, all scenes and Seedance export while round-tripping settings", () => {
    const legacy = demoProject(),
      before = clone(legacy);
    const decoded = parseProject(JSON.stringify(legacy));
    expect(decoded).toEqual(before);
    expect(decoded.director).toBeUndefined();
    decoded.director = {
      ...situationDefaults("home"),
      intentional: true,
      coverage: "second-camera",
    };
    const roundtrip = parseProject(JSON.stringify(decoded));
    expect(roundtrip).toEqual(decoded);
    expect(roundtrip.scene).toEqual(before.scene);
    expect(roundtrip.frames).toEqual(before.frames);
    expect(roundtrip.animation).toEqual(before.animation);
    expect(shotListData(roundtrip).project.director).toEqual(decoded.director);
    expect(
      directorSchema.safeParse({ ...defaultDirector, camera: "made-up-model" })
        .success,
    ).toBe(false);
  });
});
