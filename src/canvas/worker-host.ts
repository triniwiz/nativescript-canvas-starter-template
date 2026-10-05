import { Screen } from '@nativescript/core';
import { OffscreenCanvas, type Canvas, type PointerEvent } from '@nativescript/canvas';

/** What `runInWorker` sends the Worker's `serveDemo`. Sizes are in dp. */
export type HostMessage =
  | {
      type: 'start';
      canvas?: OffscreenCanvas;
      handle?: number;
      width: number;
      height: number;
      scale: number;
    }
  | { type: 'resize'; width: number; height: number }
  | { type: 'pointer'; kind: 'down' | 'move' | 'up'; x: number; y: number }
  | { type: 'pause' }
  | { type: 'resume' };

/** What `serveDemo` sends back. */
export type WorkerMessage = { type: 'error'; message: string };

/**
 * How the canvas reached the Worker: moved by `postMessage` like on the web,
 * or as a handle on runtimes that can't transfer yet (Android and iOS).
 */
export type TransferMode = 'transfer' | 'handle';

/**
 * Hands `canvas` to `worker`, which draws into it with `serveDemo`
 * (src/canvas/worker-demo.ts), and returns a function that tears it down.
 *
 * `transferControlToOffscreen()` gives the Worker the canvas' surface: the
 * view shows the Worker's frames, and only the Worker can size it from then
 * on. This side only reports what the view sees: its layout size (checked
 * every frame, as in `runDemo`), whether it is on screen, and pointer input.
 */
export function runInWorker(
  canvas: Canvas,
  worker: Worker,
  onStart?: (mode: TransferMode) => void,
  onError?: (error: unknown) => void,
): () => void {
  const scale = Screen.mainScreen.scale;
  let started = false;
  let disposed = false;
  let frameId = 0;
  let width = 0;
  let height = 0;

  const send = (message: HostMessage, transfer?: any[]) =>
    transfer ? worker.postMessage(message, transfer) : worker.postMessage(message);

  function start() {
    started = true;
    const offscreen = canvas.transferControlToOffscreen();
    const size = { width, height, scale };
    if (typeof (globalThis as any).__nsRegisterTransferable === 'function') {
      send({ type: 'start', canvas: offscreen, ...size }, [offscreen]);
      onStart?.('transfer');
    } else {
      send({ type: 'start', handle: OffscreenCanvas._toHandle(offscreen), ...size });
      onStart?.('handle');
    }
  }

  function tick() {
    frameId = 0;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h && (w !== width || h !== height)) {
      width = w;
      height = h;
      if (started) {
        send({ type: 'resize', width, height });
      } else {
        start();
      }
    }
    schedule();
  }

  function schedule() {
    if (!frameId && !disposed && canvas.isLoaded) {
      frameId = requestAnimationFrame(tick);
    }
  }

  function onLoaded() {
    send({ type: 'resume' });
    schedule();
  }

  function onUnloaded() {
    send({ type: 'pause' });
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  function fail(error: unknown) {
    console.error('[canvas worker]', error);
    onError?.(error);
  }

  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    if (event.data?.type === 'error') {
      fail(event.data.message);
    }
  };
  worker.onerror = (event: any) => fail(event?.message ?? event);

  const pointer = (kind: 'down' | 'move' | 'up') => (event: PointerEvent) =>
    send({ type: 'pointer', kind, x: event.clientX, y: event.clientY });
  const onDown = pointer('down');
  const onMove = pointer('move');
  const onUp = pointer('up');

  canvas.on('loaded', onLoaded);
  canvas.on('unloaded', onUnloaded);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  schedule();

  return () => {
    disposed = true;
    onUnloaded();
    canvas.off('loaded', onLoaded);
    canvas.off('unloaded', onUnloaded);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    worker.terminate();
  };
}
