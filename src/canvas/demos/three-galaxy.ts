import * as THREE from '@nativescript/canvas-three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Demo, DemoInstance } from '../runner';

export type GalaxyMaterial = 'glass' | 'chrome' | 'normals' | 'wireframe';

export interface ThreeStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}

export interface ThreeGalaxy extends DemoInstance {
  setMaterial(material: GalaxyMaterial): void;
}

/**
 * three.js through WebGLRenderer on the native canvas: a physically based
 * torus knot lit by a room environment and orbiting coloured lights, inside a
 * spiral galaxy of instanced cubes. Drag to orbit.
 */
export function threeGalaxy(
  options: { cubes?: number; compact?: boolean; onStats?: (stats: ThreeStats) => void } = {},
): Demo<ThreeGalaxy> {
  return (canvas, size) => {
    let { width, height } = size;
    const compact = options.compact ?? false;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas as any, antialias: true });
    renderer.setPixelRatio(size.scale);
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050816);
    scene.fog = new THREE.Fog(0x050816, 9, 24);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(compact ? 42 : 50, width / height, 0.1, 100);

    // Centrepiece.
    const knotGeometry = new THREE.TorusKnotGeometry(1.1, 0.34, compact ? 160 : 260, 36);
    const materials: Record<GalaxyMaterial, THREE.Material> = {
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x8b5cf6,
        metalness: 0.1,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        iridescence: 0.6,
        sheen: 0.4,
        sheenColor: new THREE.Color(0xf0abfc),
      }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 1, roughness: 0.08 }),
      normals: new THREE.MeshNormalMaterial(),
      wireframe: new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true }),
    };
    const knot = new THREE.Mesh(knotGeometry, materials.glass);
    scene.add(knot);

    // Orbiting point lights, each with a small glowing bulb.
    const lightColors = [0x6366f1, 0xd946ef, 0x22d3ee];
    const bulbGeometry = new THREE.SphereGeometry(0.07, 16, 8);
    const lights = lightColors.map((color) => {
      const light = new THREE.PointLight(color, 30, 12, 1.6);
      light.add(new THREE.Mesh(bulbGeometry, new THREE.MeshBasicMaterial({ color })));
      scene.add(light);
      return light;
    });
    scene.add(new THREE.HemisphereLight(0x8090ff, 0x100818, 0.6));

    // Spiral galaxy of instanced cubes.
    const count = options.cubes ?? 900;
    const cubeGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const cubeMaterial = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.4 });
    const cubes = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, count);
    const seeds = Array.from({ length: count }, (_, i) => {
      const arm = i % 3;
      const radius = 2.6 + Math.pow(Math.random(), 0.7) * 5.5;
      return {
        radius,
        angle: (arm / 3) * Math.PI * 2 + radius * 0.55 + (Math.random() - 0.5) * 0.6,
        y: (Math.random() - 0.5) * 0.5,
        spin: Math.random() * Math.PI,
        speed: 0.12 / Math.sqrt(radius),
      };
    });
    const color = new THREE.Color();
    seeds.forEach((seed, i) => {
      color.setHSL(0.62 + (seed.radius / 8) * 0.35 + Math.random() * 0.05, 0.8, 0.6);
      cubes.setColorAt(i, color);
    });
    scene.add(cubes);

    const dummy = new THREE.Object3D();
    const orbit = { yaw: 0.6, pitch: 0.35, distance: compact ? 11 : 9.5, velocity: 0 };
    let dragging: { x: number; y: number } | null = null;

    let frames = 0;
    let lastReport = 0;

    function placeCamera() {
      camera.position.set(
        Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.distance,
        Math.sin(orbit.pitch) * orbit.distance,
        Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.distance,
      );
      camera.lookAt(0, 0, 0);
    }

    return {
      frame(time, dt) {
        const t = time / 1000;
        if (!dragging) {
          orbit.velocity *= 0.95;
          orbit.yaw += orbit.velocity + dt * 0.00008;
        }
        placeCamera();

        knot.rotation.x = t * 0.25;
        knot.rotation.y = t * 0.4;

        lights.forEach((light, i) => {
          const a = t * (0.6 + i * 0.25) + (i * Math.PI * 2) / 3;
          light.position.set(Math.cos(a) * 2.6, Math.sin(a * 1.3) * 1.4, Math.sin(a) * 2.6);
        });

        seeds.forEach((seed, i) => {
          const a = seed.angle + t * seed.speed;
          dummy.position.set(
            Math.cos(a) * seed.radius,
            seed.y + Math.sin(t * 1.5 + seed.radius * 2) * 0.12,
            Math.sin(a) * seed.radius,
          );
          dummy.rotation.set(seed.spin + t, seed.spin + t * 0.7, 0);
          dummy.updateMatrix();
          cubes.setMatrixAt(i, dummy.matrix);
        });
        cubes.instanceMatrix.needsUpdate = true;

        renderer.render(scene, camera);

        frames++;
        if (options.onStats && time - lastReport >= 1000) {
          options.onStats({
            fps: lastReport ? Math.round((frames * 1000) / (time - lastReport)) : 0,
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
          });
          frames = 0;
          lastReport = time;
        }
      },
      resize(w, h) {
        width = w;
        height = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      },
      pointer(type, x, y) {
        if (type === 'down') {
          dragging = { x, y };
          orbit.velocity = 0;
        } else if (type === 'move' && dragging) {
          const dx = (x - dragging.x) / width;
          orbit.yaw -= dx * 4;
          orbit.pitch = Math.max(-1.2, Math.min(1.2, orbit.pitch + ((y - dragging.y) / height) * 3));
          orbit.velocity = -dx * 4;
          dragging = { x, y };
        } else if (type === 'up') {
          dragging = null;
        }
      },
      setMaterial(material) {
        knot.material = materials[material];
      },
      dispose() {
        renderer.dispose();
        environment.dispose();
        for (const geometry of [knotGeometry, bulbGeometry, cubeGeometry]) {
          geometry.dispose();
        }
        for (const material of [...Object.values(materials), cubeMaterial]) {
          material.dispose();
        }
        cubes.dispose();
      },
    };
  };
}
