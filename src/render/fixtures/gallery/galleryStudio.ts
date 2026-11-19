import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** The gallery's renderer, scene, camera and orbit; the fixtures come later, from the pair builder. */
export interface GalleryStudio {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
}

/** Neutral key, fill, rim and sky light, so a body's shape reads the same in every view. */
function addStudioLights(scene: Scene): void {
  const key = new DirectionalLight(0xffffff, 4);
  key.position.set(3, 5, 4);
  const fill = new DirectionalLight(0xe4e9ff, 2);
  fill.position.set(-4, 1, 3);
  const rim = new DirectionalLight(0xffffff, 3);
  rim.position.set(-1, 4, -5);
  scene.add(key, fill, rim, new HemisphereLight(0xffffff, 0x505050, 2));
}

/**
 * Creates the studio on `canvas`: the desk's tone mapping, a dark background and a mid-grey floor at y = 0. The
 * floor material is front-sided, so the `below` camera can look up through it.
 */
export function createGalleryStudio(canvas: HTMLCanvasElement): GalleryStudio {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  scene.background = new Color(0x141519);
  addStudioLights(scene);
  const floor = new Mesh(new PlaneGeometry(40, 40), new MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const camera = new PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 100);
  const controls = new OrbitControls(camera, canvas);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  return { renderer, scene, camera, controls };
}
