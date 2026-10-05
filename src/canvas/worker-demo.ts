import { OffscreenCanvas } from '@nativescript/canvas/worker';
import type { DemoInstance, DemoSize } from './runner';
import type { HostMessage, WorkerMessage } from './worker-host';

/**
 * The Worker half of `runInWorker` (src/canvas/worker-host.ts): call it from a
 * Worker's entry file to run `demo` on the canvas the main thread sends.
 *
 * It does what `runDemo` does on the main thread, from the Worker's own
 * `requestAnimationFrame` loop: keeps the backing store at layout size ×
 * screen scale (which resizes the view too), pauses while the view is off
 * screen, and forwards size changes and pointer input.
 */
export function serveDemo(demo: (canvas: OffscreenCanvas, size: DemoSize) => DemoInstance) {
  let canvas: OffscreenCanvas | null = null;
  let instance: DemoInstance | null = null;
  let scale = 1;
  let paused = false;
  let scheduled = false;
  let last = 0;

  function resize(width: number, height: number) {
    canvas!.width = Math.round(width * scale);
    canvas!.height = Math.round(height * scale);
  }

  function tick(time: number) {
    scheduled = false;
    if (paused || !instance) {
      return;
    }
    const dt = last ? Math.min(time - last, 100) : 16;
    last = time;
    try {
      instance.frame?.(time, dt);
    } catch (error) {
      fail(error);
      return;
    }
    schedule();
  }

  function schedule() {
    if (!scheduled && !paused && instance?.frame) {
      scheduled = true;
      requestAnimationFrame(tick);
    }
  }

  function fail(error: any) {
    instance = null;
    const message: WorkerMessage = { type: 'error', message: String(error?.message ?? error) };
    postMessage(message);
  }

  globalThis.onmessage = ({ data }: MessageEvent<HostMessage>) => {
    switch (data.type) {
      case 'start':
        try {
          canvas = data.canvas ?? OffscreenCanvas._fromHandle(data.handle!);
          scale = data.scale;
          resize(data.width, data.height);
          instance = demo(canvas, { width: data.width, height: data.height, scale });
        } catch (error) {
          fail(error);
          return;
        }
        schedule();
        break;
      case 'resize':
        if (canvas) {
          resize(data.width, data.height);
          instance?.resize?.(data.width, data.height);
        }
        break;
      case 'pointer':
        instance?.pointer?.(data.kind, data.x, data.y);
        break;
      case 'pause':
        paused = true;
        last = 0;
        break;
      case 'resume':
        paused = false;
        schedule();
        break;
    }
  };
}
