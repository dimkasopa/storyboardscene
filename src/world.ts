import * as THREE from "three";
import type { SceneData, SceneObject, ShotCamera } from "./model";
import { aspect, targetPoint } from "./model";
const rad = THREE.MathUtils.degToRad;
export function asset(o: SceneObject): THREE.Group {
  const root = new THREE.Group();
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
  if (o.kind === "person") {
    root.scale.setScalar(o.height / 1.75);
    const seated = o.pose === "sit",
      hip = seated ? 0.52 : 0.9,
      shoulder = hip + 0.49;
    add(new THREE.CapsuleGeometry(0.22, 0.32, 5, 10), 0, hip + 0.28, 0);
    add(new THREE.SphereGeometry(0.23, 16, 12), 0, hip, 0);
    const head = new THREE.Group();
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
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.12, hip - 0.05, 0);
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
      arm.position.set(side * 0.26, shoulder - 0.03, 0);
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
  } else if (o.kind === "table") {
    box(2.1, 0.1, 1, 0, 0.78, 0);
    for (const x of [-0.9, 0.9])
      for (const z of [-0.38, 0.38]) box(0.08, 0.74, 0.08, x, 0.37, z, dark);
  } else if (o.kind === "chair") {
    box(0.55, 0.09, 0.55, 0, 0.48, 0);
    box(0.55, 0.5, 0.08, 0, 0.79, -0.23);
    for (const x of [-0.22, 0.22])
      for (const z of [-0.22, 0.22]) box(0.05, 0.46, 0.05, x, 0.23, z, dark);
  } else if (o.kind === "sofa") {
    box(2, 0.4, 0.8, 0, 0.3, 0);
    box(2, 0.6, 0.16, 0, 0.8, -0.32);
    for (const x of [-0.94, 0.94]) box(0.16, 0.35, 0.8, x, 0.63, 0);
  } else if (o.kind === "door") {
    box(0.9, 2.1, 0.07, 0, 1.05, 0);
    box(0.05, 2.2, 0.12, -0.49, 1.1, 0, dark);
    box(0.05, 2.2, 0.12, 0.49, 1.1, 0, dark);
    box(1.03, 0.05, 0.12, 0, 2.2, 0, dark);
    box(0.13, 0.035, 0.07, 0.3, 1, 0.08, dark);
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
