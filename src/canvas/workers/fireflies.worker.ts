// The canvas API without the <Canvas> view. A Worker imports it first.
import '@nativescript/canvas/worker';
import { serveDemo } from '../worker-demo';
import { fireflies } from '../demos/fireflies';

serveDemo(fireflies());
