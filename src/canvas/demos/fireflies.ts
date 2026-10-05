import type {
  CanvasRenderingContext2D,
  OffscreenCanvas as OffscreenCanvasClass,
} from '@nativescript/canvas';
import type { DemoInstance, DemoSize } from '../runner';

// The global, so this file runs in a Worker too: @nativescript/canvas-polyfill
// installs it on the main thread, and @nativescript/canvas/worker in a Worker.
declare const OffscreenCanvas: typeof OffscreenCanvasClass;

/** Anything with a 2D context: a <Canvas> view, or an OffscreenCanvas. */
export interface Surface2D {
  getContext(contextId: '2d', options?: any): any;
}

const HUES = [52, 38, 140, 190];
const SPRITE = 64;

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  size: number;
  sprite: number;
}

/**
 * Fireflies drifting on a sine-wave current, blended additively. Each glow is
 * drawn once into an OffscreenCanvas and stamped with drawImage, far cheaper
 * than a radial gradient per firefly. Touch draws them in. The corner shows
 * the frame rate of whichever thread is drawing.
 *
 * It only uses a 2D context, so it runs as is on a <Canvas> view
 * (`runDemo`) and in a Worker (`serveDemo`).
 */
export function fireflies() {
  return (canvas: Surface2D, size: DemoSize): DemoInstance => {
    // Opaque: every frame paints its own background.
    const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    let { width, height } = size;
    const scale = size.scale;
    const sprites = HUES.map(glow);
    let flies: Firefly[] = [];
    let pointer: { x: number; y: number } | null = null;
    let fps = 0;
    let frames = 0;
    let since = 0;

    function glow(hue: number) {
      const sprite = new OffscreenCanvas(SPRITE, SPRITE);
      const g = sprite.getContext('2d') as CanvasRenderingContext2D;
      const r = SPRITE / 2;
      const gradient = g.createRadialGradient(r, r, 0, r, r, r);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 94%, 1)`);
      gradient.addColorStop(0.15, `hsla(${hue}, 100%, 66%, 0.9)`);
      gradient.addColorStop(0.45, `hsla(${hue}, 100%, 50%, 0.22)`);
      gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      g.fillStyle = gradient;
      g.fillRect(0, 0, SPRITE, SPRITE);
      return sprite;
    }

    function populate() {
      const count = Math.min(1500, Math.round((width * height) / 90));
      flies = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.4,
        size: 6 + Math.random() * 14,
        sprite: Math.floor(Math.random() * sprites.length),
      }));
    }

    populate();

    return {
      frame(time, dt) {
        frames++;
        if (!since) {
          since = time;
        } else if (time - since >= 500) {
          fps = Math.round((frames * 1000) / (time - since));
          frames = 0;
          since = time;
        }

        const k = dt / 16;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = 'lighter';
        for (const f of flies) {
          const a =
            (Math.sin(f.y * 0.012 + time * 0.0004) + Math.cos(f.x * 0.009 - time * 0.0003)) *
            Math.PI;
          let ax = Math.cos(a) * 0.05;
          let ay = Math.sin(a) * 0.05;
          if (pointer) {
            const dx = pointer.x - f.x;
            const dy = pointer.y - f.y;
            const d = Math.hypot(dx, dy) + 1;
            ax += (dx / d) * 0.25;
            ay += (dy / d) * 0.25;
          }
          f.vx = (f.vx + ax * k) * 0.96;
          f.vy = (f.vy + ay * k) * 0.96;
          f.x += f.vx * f.speed * k;
          f.y += f.vy * f.speed * k;
          // Wrap around, just past the edges so they never pop in or out.
          if (f.x < -f.size) f.x += width + f.size * 2;
          else if (f.x > width + f.size) f.x -= width + f.size * 2;
          if (f.y < -f.size) f.y += height + f.size * 2;
          else if (f.y > height + f.size) f.y -= height + f.size * 2;

          const twinkle = 0.5 + 0.5 * Math.sin(time * 0.003 * f.speed + f.phase);
          const s = f.size * (0.7 + 0.3 * twinkle);
          ctx.globalAlpha = 0.25 + 0.75 * twinkle * twinkle;
          ctx.drawImage(sprites[f.sprite], f.x - s, f.y - s, s * 2, s * 2);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
        ctx.font = '600 13px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`${fps} fps`, width - 12, 12);
      },
      resize(w, h) {
        width = w;
        height = h;
        populate();
      },
      pointer(type, x, y) {
        pointer = type === 'up' ? null : { x, y };
      },
    };
  };
}
