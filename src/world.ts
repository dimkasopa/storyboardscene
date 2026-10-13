import * as THREE from "three";
import type { SceneData, SceneObject, ShotCamera } from "./model";
import { aspect, targetPoint } from "./model";
const rad = THREE.MathUtils.degToRad;
export function asset(o: SceneObject): THREE.Group {
  const root = new THREE.Group();
  const kind = o.prop ?? o.kind;
  const material = new THREE.MeshStandardMaterial({
    color: o.color,
    roughness: 0.8,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#343f46",
    roughness: 0.85,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: o.kind === "person" ? o.color : "#ddd9cc",
    roughness: 0.8,
  });
  const add = (
    g: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    m: THREE.Material = material,
    parent: THREE.Group = root,
  ) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m = material,
  ) => add(new THREE.BoxGeometry(w, h, d), x, y, z, m);
  if (kind === "person") {
    const look = o.appearance ?? "base";
    const width = look === "slim" ? 0.75 : look === "wide" ? 1.32 : 1;
    root.scale.setScalar(o.height / 1.75);
    const seated = o.pose === "sit",
      hip = seated ? 0.52 : 0.9,
      shoulder = hip + 0.49;
    const torso = add(
      new THREE.CapsuleGeometry(0.22, 0.32, 5, 10),
      0,
      hip + 0.28,
      0,
    );
    torso.scale.set(width, 1, Math.sqrt(width));
    const pelvis = add(new THREE.SphereGeometry(0.23, 16, 12), 0, hip, 0);
    pelvis.scale.set(width, 1, Math.sqrt(width));
    const head = new THREE.Group();
    head.name = "head";
    head.position.set(0, shoulder + 0.23, 0);
    head.rotation.y = rad(o.head);
    root.add(head);
    const skull = add(
      new THREE.SphereGeometry(0.18, 20, 16),
      0,
      0,
      0,
      skin,
      head,
    );
    skull.scale.set(0.85, 1.2, 0.92);
    add(new THREE.SphereGeometry(0.05, 8, 8), 0, -0.015, 0.167, skin, head);
    for (const x of [-0.06, 0.06])
      add(new THREE.SphereGeometry(0.019, 8, 8), x, 0.035, 0.155, dark, head);
    if (look === "hair") {
      const hair = add(
        new THREE.SphereGeometry(0.195, 14, 10),
        0,
        0.16,
        -0.015,
        dark,
        head,
      );
      hair.name = "hair";
      hair.scale.set(1, 0.65, 1);
      for (const side of [-1, 1])
        add(
          new THREE.BoxGeometry(0.05, 0.19, 0.08),
          side * 0.15,
          0.03,
          -0.06,
          dark,
          head,
        );
    }
    if (look === "glasses") {
      const glasses = new THREE.Group();
      glasses.name = "glasses";
      head.add(glasses);
      for (const x of [-0.065, 0.065])
        add(
          new THREE.TorusGeometry(0.049, 0.012, 5, 12),
          x,
          0.035,
          0.176,
          dark,
          glasses,
        );
      add(
        new THREE.BoxGeometry(0.045, 0.015, 0.018),
        0,
        0.035,
        0.177,
        dark,
        glasses,
      );
      for (const side of [-1, 1])
        add(
          new THREE.BoxGeometry(0.017, 0.016, 0.12),
          side * 0.125,
          0.035,
          0.12,
          dark,
          glasses,
        );
    }
    if (look === "cap") {
      const cap = new THREE.Group();
      cap.name = "cap";
      head.add(cap);
      add(
        new THREE.SphereGeometry(0.197, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        0,
        0.09,
        0,
        dark,
        cap,
      );
      const brim = add(
        new THREE.BoxGeometry(0.31, 0.025, 0.18),
        0,
        0.12,
        0.18,
        dark,
        cap,
      );
      brim.rotation.x = -0.12;
    }
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.12 * width, hip - 0.05, 0);
      root.add(leg);
      const upper = add(
        new THREE.CapsuleGeometry(0.09, 0.26, 4, 8),
        0,
        -0.2,
        seated ? 0.19 : 0,
        dark,
        leg,
      );
      if (seated) {
        upper.rotation.x = Math.PI / 2;
        upper.position.y = -0.03;
      }
      const kneeY = seated ? -0.27 : -0.58,
        kneeZ = seated ? 0.37 : 0;
      add(
        new THREE.CapsuleGeometry(0.075, 0.29, 4, 8),
        0,
        kneeY,
        kneeZ,
        dark,
        leg,
      );
      add(
        new THREE.BoxGeometry(0.18, 0.1, 0.3),
        0,
        seated ? -0.42 : -0.8,
        kneeZ + 0.07,
        dark,
        leg,
      );
      const arm = new THREE.Group();
      arm.position.set(side * 0.26 * width, shoulder - 0.03, 0);
      root.add(arm);
      arm.rotation.z = o.arms === "raised" && side === 1 ? -2.4 : side * 0.1;
      if (o.arms === "front") arm.rotation.x = -1.1;
      add(
        new THREE.CapsuleGeometry(0.067, 0.39, 4, 8),
        0,
        -0.25,
        0,
        material,
        arm,
      );
      add(new THREE.SphereGeometry(0.075, 10, 10), 0, -0.52, 0, skin, arm);
    }
  } else if (kind === "table") {
    box(2.1, 0.1, 1, 0, 0.78, 0);
    for (const x of [-0.9, 0.9])
      for (const z of [-0.38, 0.38]) box(0.08, 0.74, 0.08, x, 0.37, z, dark);
  } else if (kind === "chair") {
    box(0.55, 0.09, 0.55, 0, 0.48, 0);
    box(0.55, 0.5, 0.08, 0, 0.79, -0.23);
    for (const x of [-0.22, 0.22])
      for (const z of [-0.22, 0.22]) box(0.05, 0.46, 0.05, x, 0.23, z, dark);
  } else if (kind === "sofa") {
    box(2, 0.4, 0.8, 0, 0.3, 0);
    box(2, 0.6, 0.16, 0, 0.8, -0.32);
    for (const x of [-0.94, 0.94]) box(0.16, 0.35, 0.8, x, 0.63, 0);
  } else if (kind === "door") {
    box(0.9, 2.1, 0.07, 0, 1.05, 0);
    box(0.05, 2.2, 0.12, -0.49, 1.1, 0, dark);
    box(0.05, 2.2, 0.12, 0.49, 1.1, 0, dark);
    box(1.03, 0.05, 0.12, 0, 2.2, 0, dark);
    box(0.13, 0.035, 0.07, 0.3, 1, 0.08, dark);
  } else if (kind === "armchair") {
    box(0.85, 0.35, 0.75, 0, 0.32, 0);
    box(0.85, 0.65, 0.15, 0, 0.78, -0.3);
    for (const x of [-0.36, 0.36]) {
      box(0.15, 0.32, 0.75, x, 0.65, 0);
      box(0.08, 0.2, 0.08, x, 0.1, 0.25, dark);
      box(0.08, 0.2, 0.08, x, 0.1, -0.25, dark);
    }
  } else if (kind === "smalltable") {
    box(0.85, 0.08, 0.65, 0, 0.65, 0);
    for (const x of [-0.34, 0.34])
      for (const z of [-0.23, 0.23]) box(0.06, 0.61, 0.06, x, 0.305, z, dark);
  } else if (kind === "reception") {
    box(2.2, 0.12, 0.75, 0, 1.1, 0);
    box(2.1, 1.05, 0.12, 0, 0.525, 0.3);
    for (const x of [-1, 1]) box(0.12, 1.05, 0.65, x, 0.525, 0);
  } else if (kind === "shelf") {
    for (const x of [-0.58, 0.58]) box(0.08, 1.9, 0.4, x, 0.95, 0);
    box(1.2, 1.9, 0.04, 0, 0.95, -0.18);
    for (const y of [0.08, 0.62, 1.18, 1.85]) box(1.2, 0.06, 0.4, 0, y, 0);
    for (const x of [-0.25, -0.1, 0.05]) box(0.08, 0.3, 0.23, x, 1.36, 0, dark);
  } else if (kind === "monitor") {
    box(0.54, 0.34, 0.04, 0, 0.36, 0, dark);
    box(0.49, 0.28, 0.015, 0, 0.36, 0.03);
    box(0.04, 0.2, 0.04, 0, 0.12, 0, dark);
    box(0.27, 0.025, 0.16, 0, 0.02, 0.03, dark);
  } else if (kind === "desk") {
    box(1.5, 0.08, 0.7, 0, 0.76, 0);
    box(0.38, 0.72, 0.6, -0.5, 0.36, 0);
    for (const z of [-0.26, 0.26]) box(0.07, 0.72, 0.07, 0.62, 0.36, z, dark);
    for (const y of [0.2, 0.42, 0.64])
      box(0.3, 0.015, 0.03, -0.5, y, 0.31, dark);
  } else if (kind === "mug") {
    add(new THREE.CylinderGeometry(0.05, 0.046, 0.11, 16), 0, 0.055, 0);
    const rim = add(
      new THREE.CylinderGeometry(0.039, 0.039, 0.004, 16),
      0,
      0.112,
      0,
      dark,
    );
    rim.name = "mug-interior";
    const handle = add(
      new THREE.TorusGeometry(0.033, 0.012, 5, 12),
      0.062,
      0.06,
      0,
    );
    handle.rotation.y = Math.PI / 2;
  } else if (kind === "phone") {
    box(0.075, 0.015, 0.15, 0, 0.01, 0, dark);
    box(0.06, 0.003, 0.12, 0, 0.019, 0);
  } else if (kind === "papers") {
    box(0.23, 0.016, 0.32, 0, 0.008, 0);
    const paper = new THREE.MeshStandardMaterial({
      color: "#eeeade",
      roughness: 1,
    });
    box(0.21, 0.004, 0.29, 0, 0.019, 0.008, paper);
    for (const z of [-0.08, -0.035, 0.01, 0.055])
      box(0.13, 0.001, 0.003, 0, 0.022, z, dark);
  } else if (kind === "box") {
    box(0.55, 0.4, 0.45, 0, 0.2, 0);
    box(0.07, 0.005, 0.45, 0, 0.403, 0, dark);
  } else if (kind === "window") {
    for (const x of [-0.68, 0, 0.68]) box(0.06, 1.2, 0.08, x, 0.6, 0, dark);
    for (const y of [0.03, 0.6, 1.17]) box(1.4, 0.06, 0.08, 0, y, 0, dark);
    const glass = new THREE.MeshStandardMaterial({
      color: "#9ab8c3",
      roughness: 0.3,
      transparent: true,
      opacity: 0.32,
    });
    box(1.3, 1.1, 0.015, 0, 0.6, 0, glass);
  } else if (kind === "partition") {
    box(1.6, 1.4, 0.08, 0, 0.78, 0);
    for (const x of [-0.65, 0.65]) box(0.08, 0.08, 0.5, x, 0.04, 0, dark);
  } else box(1, 1, 1, 0, 0.5, 0);
  if (o.kind !== "person") root.scale.fromArray(o.size);
  return root;
}
export function applyTransform(group: THREE.Object3D, o: SceneObject) {
  group.position.fromArray(o.position);
  group.rotation.y = rad(o.rotation);
}
export function configureCamera(
  camera: THREE.PerspectiveCamera,
  data: ShotCamera,
  scene: SceneData,
  time = 0,
  shake = 0,
) {
  camera.aspect = aspect(data.format);
  camera.near = 0.025;
  camera.far = 200;
  camera.filmGauge = 36;
  camera.setFocalLength(data.focal);
  camera.position.fromArray(data.position);
  camera.up.set(0, 1, 0);
  if (data.aim === "manual")
    camera.rotation.set(
      ...(data.rotation.map(rad) as [number, number, number]),
      "YXZ",
    );
  else {
    camera.lookAt(new THREE.Vector3(...targetPoint(data, scene)));
    camera.rotateZ(rad(data.rotation[2]));
  }
  if (shake) {
    camera.rotateX(Math.sin(time * 9.3) * shake * 0.009);
    camera.rotateY(Math.sin(time * 7.1 + 1) * shake * 0.012);
    camera.rotateZ(Math.sin(time * 5.7) * shake * 0.005);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
export function cameraRotation(
  data: ShotCamera,
  scene: SceneData,
): [number, number, number] {
  const c = new THREE.PerspectiveCamera();
  configureCamera(c, data, scene);
  const e = new THREE.Euler().setFromQuaternion(c.quaternion, "YXZ");
  return [e.x, e.y, e.z].map(THREE.MathUtils.radToDeg) as [
    number,
    number,
    number,
  ];
}
export function addEnvironment(scene: THREE.Scene) {
  scene.background = new THREE.Color("#cad0cc");
  scene.add(new THREE.HemisphereLight("#ffffff", "#718079", 2.4));
  const light = new THREE.DirectionalLight("#fff3dd", 3.2);
  light.position.set(3, 7, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = -12;
  light.shadow.camera.right = 12;
  light.shadow.camera.top = 12;
  light.shadow.camera.bottom = -12;
  light.shadow.bias = -0.0005;
  scene.add(light);
  const fill = new THREE.DirectionalLight("#c8e3ff", 1);
  fill.position.set(-5, 4, -2);
  scene.add(fill);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: "#d8d9cd", roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;
  floor.receiveShadow = true;
  scene.add(floor);
}
export function disposeTree(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
    }
    if (o instanceof THREE.DirectionalLight) o.shadow.dispose();
  });
  materials.forEach((m) => m.dispose());
}
