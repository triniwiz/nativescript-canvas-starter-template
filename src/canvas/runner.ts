import { Screen } from '@nativescript/core';
import type { Canvas, PointerEvent } from '@nativescript/canvas';

/** What a demo hands back once it has set itself up on a canvas. */
export interface DemoInstance {
  /** Every animation frame while the canvas is on screen. Times are in ms. */
  frame?(time: number, dt: number): void;
  /** The canvas changed size. Sizes are in dp; the backing store is already resized. */
  resize?(width: number, height: number): void;
  /** Pointer input in dp, relative to the canvas' top-left corner. */
  pointer?(type: 'down' | 'move' | 'up', x: number, y: number): void;
  dispose?(): void;
}

export interface DemoSize {
  /** Layout size in dp. */
  width: number;
  height: number;
  /** Device pixels per dp. */
  scale: number;
}

export type Demo<T extends DemoInstance = DemoInstance> = (
  canvas: Canvas,
  size: DemoSize,
) => T | Promise<T>;

/**
 * Runs `demo` on `canvas` and returns a function that tears it down.
 *
 * Like a web canvas, a NativeScript canvas starts with a 300×150 backing store
 * whatever its layout size, so the runner keeps it at layout size × screen
 * scale. It drives one requestAnimationFrame loop that pauses while the canvas
 * is unloaded (for example while its page is in the back stack) and forwards
 * size changes (window resizes, rotation) and pointer input to the demo.
 *
 * The size is checked every frame rather than on `layoutChanged`: a canvas
 * inside a MasonKit layout is laid out natively on Windows, so core never
 * raises that event for it.
 */
export function runDemo<T extends DemoInstance>(
  canvas: Canvas,
  demo: Demo<T>,
  onStart?: (instance: T) => void,
  onError?: (error: unknown) => void,
): () => void {
  const scale = Screen.mainScreen.scale;
  let instance: T | null = null;
  let disposed = false;
  let frameId = 0;
  let last = 0;
  let width = 0;
  let height = 0;

  function syncSize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) {
      return false;
    }
    width = w;
    height = h;
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    return true;
  }

  function tick(time: number) {
    frameId = 0;
    if (disposed || !instance) {
      return;
    }
    const dt = last ? Math.min(time - last, 100) : 16;
    last = time;
    try {
      if (syncSize()) {
        instance.resize?.(width, height);
      }
      instance.frame?.(time, dt);
    } catch (error) {
      fail(error);
      return;
    }
    schedule();
  }

  function schedule() {
    if (!frameId && !disposed && instance?.frame && canvas.isLoaded) {
      frameId = requestAnimationFrame(tick);
    }
  }

  function pause() {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
    last = 0;
  }

  function fail(error: unknown) {
    pause();
    console.error('[canvas demo]', error);
    onError?.(error);
  }

  const pointer = (type: 'down' | 'move' | 'up') => (event: PointerEvent) =>
    instance?.pointer?.(type, event.clientX, event.clientY);
  const onDown = pointer('down');
  const onMove = pointer('move');
  const onUp = pointer('up');

  canvas.on('loaded', schedule);
  canvas.on('unloaded', pause);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  syncSize();
  Promise.resolve()
    .then(() => demo(canvas, { width, height, scale }))
    .then((created) => {
      if (disposed) {
        created.dispose?.();
        return;
      }
      instance = created;
      onStart?.(created);
      schedule();
    })
    .catch(fail);

  return () => {
    disposed = true;
    pause();
    canvas.off('loaded', schedule);
    canvas.off('unloaded', pause);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    instance?.dispose?.();
    instance = null;
  };
}
