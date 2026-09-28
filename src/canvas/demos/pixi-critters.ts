import '@nativescript/canvas-pixi';
import { Application, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { Demo, DemoInstance } from '../runner';

export type PixiBackend = 'webgl' | 'webgpu';

export interface PixiStats {
  sprites: number;
  fps: number;
  renderer: string;
}

export interface PixiCritters extends DemoInstance {
  /** Adds `count` sprites, from (x, y) in dp or from the top of the stage. */
  add(count: number, x?: number, y?: number): void;
  clear(): void;
}

interface Critter {
  sprite: Sprite;
  vx: number;
  vy: number;
  spin: number;
}

const TINTS = [0x818cf8, 0xa78bfa, 0xf472b6, 0x22d3ee, 0x34d399, 0xfbbf24, 0xfb7185];

/**
 * PixiJS v8 on the native canvas: textures generated from vector Graphics,
 * a parallax starfield and a "bunnymark" of bouncing sprites. Tap to burst.
 */
export function pixiCritters(
  options: { backend?: PixiBackend; initial?: number; onStats?: (stats: PixiStats) => void } = {},
): Demo<PixiCritters> {
  return async (canvas, size) => {
    let { width, height } = size;
    const app = new Application();
    await app.init({
      canvas: canvas as any,
      preference: options.backend ?? 'webgl',
      width,
      height,
      resolution: size.scale,
      autoDensity: false,
      antialias: true,
      background: '#070b1a',
      // The demo runner owns the frame loop and calls app.render().
      autoStart: false,
      sharedTicker: false,
    });

    // Vector shapes rendered once into textures.
    const shapes = [
      new Graphics().circle(0, 0, 14).fill({ color: 0xffffff, alpha: 0.18 }).circle(0, 0, 9).fill(0xffffff),
      new Graphics().star(0, 0, 5, 14, 6).fill(0xffffff),
      new Graphics().roundRect(-11, -11, 22, 22, 6).fill(0xffffff),
      new Graphics().poly([0, -14, 13, 10, -13, 10]).fill(0xffffff),
    ];
    const textures: Texture[] = shapes.map((shape) =>
      app.renderer.generateTexture({ target: shape, resolution: size.scale, antialias: true }),
    );
    shapes.forEach((shape) => shape.destroy());

    // Three layers of stars drifting at different speeds.
    const stars = new Container();
    const starLayers = [0.15, 0.35, 0.7].map((speed, layer) => {
      const g = new Graphics();
      const points = Array.from({ length: 70 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * (layer + 1) * 0.5,
      }));
      stars.addChild(g);
      return { g, speed, points, offset: 0 };
    });
    app.stage.addChild(stars);

    const world = new Container();
    app.stage.addChild(world);
    const critters: Critter[] = [];

    function add(n: number, x?: number, y?: number) {
      for (let i = 0; i < n; i++) {
        const sprite = new Sprite(textures[(critters.length + i) % textures.length]);
        sprite.anchor.set(0.5);
        sprite.tint = TINTS[Math.floor(Math.random() * TINTS.length)];
        sprite.scale.set(0.6 + Math.random() * 0.7);
        sprite.position.set(x ?? Math.random() * width, y ?? 20);
        const burst = x !== undefined;
        const angle = Math.random() * Math.PI * 2;
        const speed = burst ? 2 + Math.random() * 6 : 0;
        critters.push({
          sprite,
          vx: burst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 8,
          vy: burst ? Math.sin(angle) * speed - 4 : Math.random() * 4,
          spin: (Math.random() - 0.5) * 0.2,
        });
        world.addChild(sprite);
      }
    }

    function clear() {
      for (const c of critters) {
        c.sprite.destroy();
      }
      critters.length = 0;
    }

    function drawStars() {
      for (const layer of starLayers) {
        layer.g.clear();
        for (const p of layer.points) {
          const x = ((p.x * width + layer.offset) % width + width) % width;
          layer.g.circle(x, p.y * height, p.r);
        }
        layer.g.fill({ color: 0xffffff, alpha: 0.35 + layer.speed * 0.6 });
      }
    }

    add(options.initial ?? 300);

    const rendererName = app.renderer.name === 'webgpu' ? 'WebGPU' : 'WebGL';
    let frames = 0;
    let lastReport = 0;

    return {
      frame(time, dt) {
        const k = dt / 16.67;
        for (const layer of starLayers) {
          layer.offset -= layer.speed * k;
        }
        drawStars();

        const gravity = 0.5 * k;
        for (const c of critters) {
          const s = c.sprite;
          c.vy += gravity;
          s.x += c.vx * k;
          s.y += c.vy * k;
          s.rotation += c.spin * k;
          if (s.x > width) {
            c.vx *= -1;
            s.x = width;
          } else if (s.x < 0) {
            c.vx *= -1;
            s.x = 0;
          }
          if (s.y > height) {
            c.vy *= -0.85;
            s.y = height;
            if (Math.random() > 0.5) {
              c.vy -= Math.random() * 6;
            }
          } else if (s.y < 0) {
            c.vy = 0;
            s.y = 0;
          }
        }

        app.render();

        frames++;
        if (options.onStats && time - lastReport >= 500) {
          options.onStats({
            sprites: critters.length,
            fps: lastReport ? Math.round((frames * 1000) / (time - lastReport)) : 0,
            renderer: rendererName,
          });
          frames = 0;
          lastReport = time;
        }
      },
      resize(w, h) {
        width = w;
        height = h;
        app.renderer.resize(w, h);
      },
      pointer(type, x, y) {
        if (type === 'down') {
          add(60, x, y);
        }
      },
      add,
      clear,
      dispose() {
        clear();
        textures.forEach((texture) => texture.destroy(true));
        app.destroy({ removeView: false }, { children: true });
      },
    };
  };
}
