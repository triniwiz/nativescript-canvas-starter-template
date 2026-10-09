import type { CanvasRenderingContext2D } from '@nativescript/canvas';
import type { Demo, DemoInstance } from '../../canvas/runner';

/** Hue ranges (degrees) the particles pick their colour from. */
export const flowPalettes = {
  aurora: [150, 175, 200, 265, 290],
  ember: [0, 15, 30, 42, 330],
  ocean: [185, 200, 215, 230, 245],
} as const;

export type FlowPalette = keyof typeof flowPalettes;

export interface FlowField extends DemoInstance {
  setPalette(palette: FlowPalette): void;
  /** Wipes the trails. */
  clear(): void;
}

interface Particle {
  x: number;
  y: number;
  life: number;
  bucket: number;
}

/**
 * Generative art in plain Canvas 2D: particles follow an animated flow field
 * and leave additive-blended trails. Dragging on the canvas stirs the field.
 */
export function flowField(options: { palette?: FlowPalette; density?: number } = {}): Demo<FlowField> {
  return (canvas, size) => {
    // Opaque: every frame paints its own background.
    const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    let { width, height } = size;
    const scale = size.scale;
    let hues: readonly number[] = flowPalettes[options.palette ?? 'aurora'];
    const density = options.density ?? 1;
    let particles: Particle[] = [];
    let pointer: { x: number; y: number } | null = null;

    function spawn(p: Particle) {
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.life = 80 + Math.random() * 220;
      p.bucket = Math.floor(Math.random() * hues.length);
      return p;
    }

    function populate() {
      const count = Math.min(2200, Math.round(((width * height) / 260) * density));
      particles = Array.from({ length: count }, () => spawn({ x: 0, y: 0, life: 0, bucket: 0 }));
    }

    function clear() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Smooth, cheap stand-in for noise: a few interfering sine waves.
    function angle(x: number, y: number, t: number) {
      return (
        (Math.sin(x * 0.0045 + t * 0.00031) +
          Math.cos(y * 0.0052 - t * 0.00023) +
          Math.sin((x + y) * 0.0021 + t * 0.00017)) *
        Math.PI
      );
    }

    populate();
    clear();

    // One path per colour bucket keeps the number of stroke calls tiny.
    const paths: number[][] = [];

    return {
      frame(time) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(2, 6, 23, 0.07)';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < hues.length; i++) {
          paths[i] = [];
        }

        for (const p of particles) {
          let a = angle(p.x, p.y, time);
          if (pointer) {
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 140 * 140) {
              // Swirl around the finger.
              a = Math.atan2(dy, dx) + Math.PI / 2;
            }
          }
          const nx = p.x + Math.cos(a) * 1.6;
          const ny = p.y + Math.sin(a) * 1.6;
          paths[p.bucket].push(p.x, p.y, nx, ny);
          p.x = nx;
          p.y = ny;
          if (--p.life <= 0 || nx < 0 || ny < 0 || nx > width || ny > height) {
            spawn(p);
          }
        }

        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        for (let i = 0; i < hues.length; i++) {
          const segments = paths[i];
          if (!segments.length) {
            continue;
          }
          ctx.strokeStyle = `hsla(${hues[i]}, 85%, 62%, 0.55)`;
          ctx.beginPath();
          for (let j = 0; j < segments.length; j += 4) {
            ctx.moveTo(segments[j], segments[j + 1]);
            ctx.lineTo(segments[j + 2], segments[j + 3]);
          }
          ctx.stroke();
        }
      },
      resize(w, h) {
        width = w;
        height = h;
        populate();
        clear();
      },
      pointer(type, x, y) {
        pointer = type === 'up' ? null : { x, y };
      },
      setPalette(palette) {
        hues = flowPalettes[palette];
        for (const p of particles) {
          p.bucket = Math.floor(Math.random() * hues.length);
        }
      },
      clear,
    };
  };
}
