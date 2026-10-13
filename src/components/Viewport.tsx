import type { EditorVisibility } from "./EditorDisplay";
import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import {
  addEnvironment,
  asset,
  cameraRotation,
  configureCamera,
  disposeTree,
} from "../world";
import {
  type SceneData,
  type ShotCamera,
  type Vec3,
  makeCamera,
  characterLabel,
  aspect,
} from "../model";
export type ViewAPI = {
  capture: () => ShotCamera;
  view: (kind: string) => void;
};
type Props = {
  scene: SceneData;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onTransform: (id: string, position: Vec3, rotation: Vec3) => void;
  begin: () => void;
  end: () => void;
  mode: "translate" | "rotate";
  onAPI: (api: ViewAPI) => void;
  disabled?: boolean;
  visibility: EditorVisibility;
  portal?: RefObject<HTMLDivElement>;
};
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="webgl-error">
        Не удалось открыть 3D-вид. Включите аппаратное ускорение в Chrome / Edge
        и перезагрузите страницу. Ваш проект можно сохранить в JSON.
      </div>
    ) : (
      this.props.children
    );
  }
}
function canWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
const webgl = canWebGL();
function Environment() {
  const world = useMemo(() => {
    const s = new THREE.Scene();
    addEnvironment(s);
    return s;
  }, []);
  useEffect(() => () => disposeTree(world), [world]);
  return (
    <>
      <color attach="background" args={["#cad0cc"]} />
      <primitive object={world} />
    </>
  );
}
function Asset({ object }: { object: SceneData["objects"][number] }) {
  const mesh = useMemo(
    () => asset(object),
    [
      object.kind,
      object.prop,
      object.appearance,
      object.color,
      object.height,
      object.pose,
      object.arms,
      object.head,
      object.size[0],
      object.size[1],
      object.size[2],
    ],
  );
  useEffect(() => () => disposeTree(mesh), [mesh]);
  return <primitive object={mesh} />;
}
function ObjectView({
  o,
  props,
}: {
  o: SceneData["objects"][number];
  props?: Props;
}) {
  const group = useRef<THREE.Group>(null!);
  const active = props?.selected === o.id && !props.disabled;
  const node = (
    <group
      ref={group}
      position={o.position}
      rotation={[0, THREE.MathUtils.degToRad(o.rotation), 0]}
      onPointerDown={
        props
          ? (e) => {
              e.stopPropagation();
              if (!props.disabled) props.onSelect(o.id);
            }
          : undefined
      }
    >
      <Asset object={o} />
      {props &&
        (o.kind === "person" ? props.visibility.personLabels : active) && (
          <Html
            portal={props.portal}
            position={[0, o.kind === "person" ? o.height + 0.22 : 1.4, 0]}
            center
            className="object-label"
          >
            {characterLabel(o)}
          </Html>
        )}
    </group>
  );
  return (
    <>
      {node}
      {active && (
        <TransformControls
          object={group}
          mode={props.mode}
          showX={props.mode === "translate"}
          showY
          showZ={props.mode === "translate"}
          onMouseDown={props.begin}
          onMouseUp={props.end}
          onObjectChange={() => {
            const g = group.current;
            if (g)
              props.onTransform(o.id, g.position.toArray() as Vec3, [
                0,
                THREE.MathUtils.radToDeg(g.rotation.y),
                0,
              ]);
          }}
        />
      )}
    </>
  );
}
function CameraMarker({ c, props }: { c: ShotCamera; props: Props }) {
  const group = useRef<THREE.Group>(null!),
    active = props.selected === c.id && !props.disabled;
  const camera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera();
    configureCamera(cam, c, props.scene);
    cam.far = 3.5;
    cam.updateProjectionMatrix();
    return cam;
  }, [c, props.scene]);
  const helper = useMemo(() => new THREE.CameraHelper(camera), [camera]);
  useEffect(() => () => helper.dispose(), [helper]);
  const rotation = cameraRotation(c, props.scene).map(
    THREE.MathUtils.degToRad,
  ) as Vec3;
  const node = (
    <group
      ref={group}
      position={c.position}
      rotation={new THREE.Euler(...rotation, "YXZ")}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!props.disabled) props.onSelect(c.id);
      }}
    >
      <mesh>
        <boxGeometry args={[0.22, 0.16, 0.27]} />
        <meshStandardMaterial
          color={c.id === props.scene.activeCameraId ? "#c99e59" : "#61747b"}
        />
      </mesh>
      <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.1, 0.16, 8]} />
        <meshStandardMaterial color="#202e35" />
      </mesh>
      {props.visibility.cameraLabels && (
        <Html
          portal={props.portal}
          position={[0, 0.24, 0]}
          center
          className="camera-label"
        >
          {c.name}
        </Html>
      )}
    </group>
  );
  return (
    <>
      {node}
      {active && (
        <TransformControls
          object={group}
          mode={props.mode}
          onMouseDown={props.begin}
          onMouseUp={props.end}
          onObjectChange={() => {
            const g = group.current;
            if (g) {
              const e = new THREE.Euler().setFromQuaternion(
                g.quaternion,
                "YXZ",
              );
              props.onTransform(
                c.id,
                g.position.toArray() as Vec3,
                [e.x, e.y, e.z].map(THREE.MathUtils.radToDeg) as Vec3,
              );
            }
          }}
        />
      )}
      {props.visibility.frustums && c.id === props.scene.activeCameraId && (
        <primitive object={helper} />
      )}
    </>
  );
}
function EditorWorld(props: Props) {
  const { camera } = useThree();
  const controls = useRef<OrbitImpl>(null);
  useEffect(() => {
    props.onAPI({
      capture: () => {
        const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ"),
          c = makeCamera();
        c.name = "Из обзора сцены";
        c.position = camera.position.toArray() as Vec3;
        c.rotation = [e.x, e.y, e.z].map(THREE.MathUtils.radToDeg) as Vec3;
        c.aim = "manual";
        c.focal = THREE.MathUtils.clamp(
          (camera as THREE.PerspectiveCamera).getFocalLength(),
          10,
          200,
        );
        return c;
      },
      view: (kind) => {
        const target = new THREE.Vector3(0, 1, 0);
        const positions: Record<string, Vec3> = {
          perspective: [7, 5, 8],
          top: [0, 11, 0.001],
          front: [0, 2, 10],
          side: [10, 2, 0],
        };
        camera.position.fromArray(positions[kind] || positions.perspective);
        camera.up.set(0, 1, 0);
        camera.lookAt(target);
        if (controls.current) {
          controls.current.target.copy(target);
          controls.current.update();
        }
      },
    });
  }, [camera, props.onAPI]);
  return (
    <>
      <Environment />
      {props.visibility.grid && (
        <gridHelper
          args={[30, 30, "#929f99", "#b9c2b9"]}
          position={[0, 0.003, 0]}
        />
      )}
      {props.scene.objects.map((o) => (
        <ObjectView key={o.id} o={o} props={props} />
      ))}
      {props.scene.cameras.map((c) => (
        <CameraMarker key={c.id} c={c} props={props} />
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 1, 0]}
        minDistance={0.3}
        maxDistance={50}
        enabled={!props.disabled}
      />
    </>
  );
}
export function EditorViewport(props: Props) {
  const portal = useRef<HTMLDivElement>(null!);
  const [ready, setReady] = useState(false);
  const attachPortal = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      portal.current = node;
      setReady(true);
    }
  }, []);
  // Html uses an explicit stable portal rather than the Canvas event target,
  // which can change during initial mount or rapid project replacement.
  return (
    <Boundary>
      {webgl ? (
        <div className="editor-viewport">
          <div className="editor-label-layer" ref={attachPortal} />
          {ready && (
            <Canvas
              shadows
              camera={{ position: [7, 5, 8], fov: 45, near: 0.025, far: 200 }}
              dpr={[1, 1.5]}
              onPointerMissed={() => props.onSelect(null)}
            >
              <EditorWorld {...props} portal={portal} />
            </Canvas>
          )}
        </div>
      ) : (
        <div className="webgl-error">
          WebGL 2 недоступен. Включите аппаратное ускорение браузера. Сохранение
          JSON остаётся доступным.
        </div>
      )}
    </Boundary>
  );
}
function PreviewWorld({
  scene,
  fly,
  onFly,
  onExit,
  time,
  shake,
}: {
  scene: SceneData;
  fly: boolean;
  onFly: (c: Partial<ShotCamera>) => void;
  onExit: () => void;
  time: number;
  shake: number;
}) {
  const { camera, gl } = useThree();
  const current = scene.cameras.find((c) => c.id === scene.activeCameraId)!;
  const keys = useRef(new Set<string>()),
    movement = useRef({ x: 0, y: 0 }),
    drag = useRef(false),
    last = useRef(0);
  useLayoutEffect(() => {
    configureCamera(
      camera as THREE.PerspectiveCamera,
      current,
      scene,
      time,
      fly ? 0 : shake,
    );
  }, [camera, current, scene, time, shake, fly]);
  useEffect(() => {
    if (!fly) return;
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }
      if (
        (e.target as HTMLElement).matches(
          "input,textarea,select,[contenteditable]",
        )
      )
        return;
      if (
        ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ShiftLeft"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
        keys.current.add(e.code);
      }
    };
    const keyup = (e: KeyboardEvent) => keys.current.delete(e.code);
    const down = (e: PointerEvent) => {
      drag.current = true;
      gl.domElement.setPointerCapture(e.pointerId);
    };
    const up = () => {
      drag.current = false;
    };
    const move = (e: PointerEvent) => {
      if (drag.current) {
        movement.current.x += e.movementX;
        movement.current.y += e.movementY;
      }
    };
    const blur = () => {
      keys.current.clear();
      drag.current = false;
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    gl.domElement.addEventListener("pointerdown", down);
    gl.domElement.addEventListener("pointerup", up);
    gl.domElement.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      gl.domElement.removeEventListener("pointerdown", down);
      gl.domElement.removeEventListener("pointerup", up);
      gl.domElement.removeEventListener("pointermove", move);
      keys.current.clear();
    };
  }, [fly, gl, onExit]);
  useFrame((state, dt) => {
    if (!fly) return;
    const m = movement.current;
    if (!keys.current.size && !m.x && !m.y) return;
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    e.y -= m.x * 0.004;
    e.x = THREE.MathUtils.clamp(e.x - m.y * 0.004, -1.55, 1.55);
    m.x = 0;
    m.y = 0;
    camera.quaternion.setFromEuler(e);
    const k = keys.current,
      speed = Math.min(dt, 0.05) * (k.has("ShiftLeft") ? 5 : 1.8);
    camera.translateX((Number(k.has("KeyD")) - Number(k.has("KeyA"))) * speed);
    camera.translateZ((Number(k.has("KeyS")) - Number(k.has("KeyW"))) * speed);
    camera.position.y +=
      (Number(k.has("KeyE")) - Number(k.has("KeyQ"))) * speed;
    if (state.clock.elapsedTime - last.current > 0.03) {
      last.current = state.clock.elapsedTime;
      onFly({
        position: camera.position.toArray() as Vec3,
        rotation: [e.x, e.y, e.z].map(THREE.MathUtils.radToDeg) as Vec3,
        aim: "manual",
      });
    }
  });
  return (
    <>
      <Environment />
      {scene.objects.map((o) => (
        <ObjectView key={o.id} o={o} />
      ))}
    </>
  );
}
export function CameraPreview(props: {
  scene: SceneData;
  fly: boolean;
  onFly: (c: Partial<ShotCamera>) => void;
  onExit: () => void;
  time: number;
  shake: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState({ width: 1, height: 1 });
  useLayoutEffect(() => {
    const element = holder.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSpace({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height),
      }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const c = props.scene.cameras.find(
    (c) => c.id === props.scene.activeCameraId,
  )!;
  const width = Math.min(space.width, space.height * aspect(c.format));
  return (
    <Boundary>
      <div className="camera-fit" ref={holder}>
        <div
          className={`camera-image ${props.fly ? "flying" : ""}`}
          style={{ width, height: width / aspect(c.format) }}
        >
          {webgl ? (
            <Canvas shadows camera={{ near: 0.025, far: 200 }} dpr={[1, 1.5]}>
              <PreviewWorld {...props} />
            </Canvas>
          ) : (
            <div className="webgl-error">Предпросмотр требует WebGL 2.</div>
          )}
        </div>
      </div>
    </Boundary>
  );
}
