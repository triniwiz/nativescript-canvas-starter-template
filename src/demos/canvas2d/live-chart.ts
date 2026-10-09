import type { CanvasRenderingContext2D } from '@nativescript/canvas';
import type { Demo } from '../../canvas/runner';

export interface ChartSeries {
  name: string;
  color: string;
  /** Latest sample, 0–100. */
  value: number;
}

interface Series {
  name: string;
  color: string;
  fill: string;
  base: number;
  wobble: number;
  phase: number;
  values: number[];
}

const SAMPLES = 90;

/**
 * A streaming area chart: smooth curves, gradient fills, grid lines, labels
 * and a glowing "now" marker. `onSample` reports the latest values so the UI
 * around the canvas can show them too.
 */
export function liveChart(
  options: { onSample?: (series: ChartSeries[]) => void; compact?: boolean } = {},
): Demo {
  return (canvas, size) => {
    // Opaque: every frame paints its own background.
    const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    let { width, height } = size;
    const scale = size.scale;
    const compact = options.compact ?? false;

    const series: Series[] = [
      { name: 'Render', color: '#818cf8', fill: 'rgba(129, 140, 248, 0.35)', base: 58, wobble: 18, phase: 0, values: [] },
      { name: 'Layout', color: '#f472b6', fill: 'rgba(244, 114, 182, 0.3)', base: 36, wobble: 14, phase: 2, values: [] },
      { name: 'Script', color: '#34d399', fill: 'rgba(52, 211, 153, 0.25)', base: 20, wobble: 10, phase: 4, values: [] },
    ];

    let t = 0;
    function sample(s: Series) {
      const v =
        s.base +
        Math.sin(t * 0.09 + s.phase) * s.wobble * 0.6 +
        Math.sin(t * 0.023 + s.phase * 1.7) * s.wobble * 0.4 +
        (Math.random() - 0.5) * s.wobble * 0.5;
      return Math.max(2, Math.min(98, v));
    }

    for (let i = 0; i < SAMPLES; i++, t++) {
      for (const s of series) {
        s.values.push(sample(s));
      }
    }

    let acc = 0;
    let reported = 0;
    // Advances in fractions of a sample so the curve scrolls smoothly.
    let offset = 0;
    const step = 120;

    return {
      frame(time, dt) {
        acc += dt;
        while (acc >= step) {
          acc -= step;
          t++;
          for (const s of series) {
            s.values.shift();
            s.values.push(sample(s));
          }
        }
        offset = acc / step;

        if (options.onSample && time - reported > 500) {
          reported = time;
          options.onSample(
            series.map((s) => ({ name: s.name, color: s.color, value: s.values[s.values.length - 1] })),
          );
        }

        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.fillStyle = '#0b1020';
        ctx.fillRect(0, 0, width, height);

        const left = compact ? 0 : 36;
        const top = compact ? 6 : 16;
        const right = width - (compact ? 0 : 12);
        const bottom = height - (compact ? 0 : 24);
        const w = right - left;
        const h = bottom - top;
        const dx = w / (SAMPLES - 2);
        const x = (i: number) => left + (i - offset) * dx;
        const y = (v: number) => bottom - (v / 100) * h;

        if (!compact) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
          ctx.lineWidth = 1;
          ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
          ctx.font = '500 10px sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          for (let g = 0; g <= 4; g++) {
            const gy = top + (h * g) / 4;
            ctx.beginPath();
            ctx.moveTo(left, gy);
            ctx.lineTo(right, gy);
            ctx.stroke();
            ctx.fillText(`${100 - g * 25}`, left - 8, gy);
          }
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          for (let sec = 0; sec <= 10; sec += 2) {
            const gx = right - (sec * 1000) / step * dx;
            ctx.fillText(sec === 0 ? 'now' : `-${sec}s`, gx, bottom + 8);
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(left, 0, w, height);
        ctx.clip();
        for (const s of series) {
          ctx.beginPath();
          ctx.moveTo(x(0), y(s.values[0]));
          for (let i = 1; i < s.values.length - 1; i++) {
            const mx = (x(i) + x(i + 1)) / 2;
            const my = (y(s.values[i]) + y(s.values[i + 1])) / 2;
            ctx.quadraticCurveTo(x(i), y(s.values[i]), mx, my);
          }
          const lastI = s.values.length - 1;
          ctx.lineTo(x(lastI), y(s.values[lastI]));

          ctx.strokeStyle = s.color;
          ctx.lineWidth = compact ? 1.5 : 2;
          ctx.stroke();

          ctx.lineTo(x(lastI), bottom);
          ctx.lineTo(x(0), bottom);
          ctx.closePath();
          const gradient = ctx.createLinearGradient(0, top, 0, bottom);
          gradient.addColorStop(0, s.fill);
          gradient.addColorStop(1, 'rgba(11, 16, 32, 0)');
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        ctx.restore();

        if (!compact) {
          for (const s of series) {
            const v = s.values[s.values.length - 2];
            ctx.save();
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(x(SAMPLES - 2), y(v), 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      },
      resize(w, h) {
        width = w;
        height = h;
      },
    };
  };
}
