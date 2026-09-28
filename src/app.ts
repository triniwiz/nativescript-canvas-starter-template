// Browser globals (window, document, Image, fetch, ...) that three.js, PixiJS
// and the SVG DOM expect. Import it before anything that uses them.
import '@nativescript/canvas-polyfill';
import { createApp, registerElement } from 'nativescript-vue';
import { View } from '@triniwiz/nativescript-masonkit';
import { installMasonKit } from '@triniwiz/nativescript-masonkit/vue';
import { Canvas } from '@nativescript/canvas';
import { Svg } from '@nativescript/canvas-svg';
import Home from './components/Home.vue';

// Start every MasonKit element from Tailwind's preflight baseline
// (border-box, no UA margins/padding). Must run before any view is created.
View.preflight = true;

// Registers MasonKit's elements (<view>, <text>, <scroll>, <button>, ...) and
// the HTML-shaped ones (<div>, <section>, <h1>, <p>, <span>, ...).
installMasonKit();

// <Canvas> (2D, WebGL, WebGL2, WebGPU) and <Svg> are regular NativeScript
// views, so they sit in MasonKit layouts and take Tailwind classes like any
// other element.
registerElement('Canvas', () => Canvas);
registerElement('Svg', () => Svg);

createApp(Home).start();
