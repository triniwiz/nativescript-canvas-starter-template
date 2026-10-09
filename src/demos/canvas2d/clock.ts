import type { CanvasRenderingContext2D } from '@nativescript/canvas';
import type { Demo } from '../../canvas/runner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * An analog clock: transforms, arcs, radial and linear gradients, shadows and
 * text, redrawn every frame with a sweeping second hand.
 */
export function clock(): Demo {
  return (canvas, size) => {
    // Opaque: every frame paints its own background.
    const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    let { width, height } = size;
    const scale = size.scale;

    function hand(angle: number, length: number, tail: number, lineWidth: number, color: string) {
      ctx.save();
      ctx.rotate(angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, tail);
      ctx.lineTo(0, -length);
      ctx.stroke();
      ctx.restore();
    }

    return {
      frame() {
        const now = new Date();
        const ms = now.getMilliseconds();
        const s = now.getSeconds() + ms / 1000;
        const m = now.getMinutes() + s / 60;
        const h = (now.getHours() % 12) + m / 60;

        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, '#0f172a');
        bg.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        const r = Math.min(width, height) * 0.4;
        ctx.translate(width / 2, height / 2 - r * 0.06);

        // Dial with a soft glow.
        ctx.save();
        ctx.shadowColor = 'rgba(139, 92, 246, 0.6)';
        ctx.shadowBlur = 30;
        const face = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
        face.addColorStop(0, '#312e81');
        face.addColorStop(1, '#0b1020');
        ctx.fillStyle = face;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Seconds progress ring.
        ctx.lineCap = 'round';
        ctx.lineWidth = r * 0.035;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2);
        ctx.stroke();
        const ring = ctx.createLinearGradient(-r, -r, r, r);
        ring.addColorStop(0, '#22d3ee');
        ring.addColorStop(0.5, '#a78bfa');
        ring.addColorStop(1, '#f472b6');
        ctx.strokeStyle = ring;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.93, -Math.PI / 2, -Math.PI / 2 + (s / 60) * Math.PI * 2);
        ctx.stroke();

        // Ticks.
        for (let i = 0; i < 60; i++) {
          const major = i % 5 === 0;
          ctx.save();
          ctx.rotate((i / 60) * Math.PI * 2);
          ctx.strokeStyle = major ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)';
          ctx.lineWidth = major ? r * 0.022 : r * 0.01;
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.84);
          ctx.lineTo(0, -r * (major ? 0.74 : 0.79));
          ctx.stroke();
          ctx.restore();
        }

        // Numerals.
        ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
        ctx.font = `600 ${Math.round(r * 0.13)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let n = 1; n <= 12; n++) {
          const a = (n / 12) * Math.PI * 2;
          ctx.fillText(String(n), Math.sin(a) * r * 0.62, -Math.cos(a) * r * 0.62);
        }

        // Hands.
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        hand((h / 12) * Math.PI * 2, r * 0.42, r * 0.08, r * 0.055, '#e2e8f0');
        hand((m / 60) * Math.PI * 2, r * 0.62, r * 0.1, r * 0.035, '#c4b5fd');
        hand((s / 60) * Math.PI * 2, r * 0.72, r * 0.16, r * 0.014, '#f472b6');
        ctx.restore();

        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // Digital readout under the dial.
        const pad = (v: number) => String(v).padStart(2, '0');
        ctx.fillStyle = '#f8fafc';
        ctx.font = `700 ${Math.round(r * 0.16)}px sans-serif`;
        ctx.fillText(
          `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
          0,
          r * 1.18,
        );
        ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
        ctx.font = `500 ${Math.round(r * 0.09)}px sans-serif`;
        ctx.fillText(`${DAYS[now.getDay()]} · ${now.getDate()} ${MONTHS[now.getMonth()]}`, 0, r * 0.3);
      },
      resize(w, h) {
        width = w;
        height = h;
      },
    };
  };
}
