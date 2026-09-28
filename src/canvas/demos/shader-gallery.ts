import type { WebGLProgram, WebGLRenderingContext, WebGLUniformLocation } from '@nativescript/canvas';
import type { Demo, DemoInstance } from '../runner';

const HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
vec2 centered() {
  return (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
}
vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}
`;

/** Full-screen fragment shaders. `u_pointer` is in the same space as `centered()`. */
export const shaders = {
  plasma: `
void main() {
  vec2 uv = centered();
  float t = u_time * 0.6;
  float v = sin(uv.x * 3.0 + t)
          + sin(uv.y * 3.0 + t * 1.3)
          + sin((uv.x + uv.y) * 2.0 + t * 0.7)
          + sin(length(uv - u_pointer) * 7.0 - t * 2.0);
  vec3 col = palette(v * 0.18 + t * 0.05);
  gl_FragColor = vec4(col * col, 1.0);
}`,
  tunnel: `
void main() {
  vec2 uv = centered() - u_pointer * 0.35;
  float r = length(uv);
  float a = atan(uv.y, uv.x) / 3.14159;
  vec2 st = vec2(a * 4.0, 0.35 / r + u_time * 0.6);
  float c = mod(floor(st.x * 2.0) + floor(st.y * 2.0), 2.0);
  vec3 col = mix(vec3(0.39, 0.4, 0.95), vec3(0.85, 0.27, 0.94), c);
  col = mix(col, palette(st.y * 0.1), 0.35);
  col *= smoothstep(0.0, 0.6, r);
  gl_FragColor = vec4(col, 1.0);
}`,
  aurora: `
void main() {
  vec2 uv = centered();
  float t = u_time;
  vec3 col = vec3(0.01, 0.02, 0.06);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float y = sin(uv.x * (1.3 + fi * 0.35) + t * (0.5 + fi * 0.12) + fi) * 0.28
            + sin(uv.x * 3.1 - t * 0.7 + fi * 2.0) * 0.06
            + (fi - 2.5) * 0.14 + u_pointer.y * 0.2;
    float d = abs(uv.y - y);
    col += palette(fi * 0.12 + t * 0.03 + uv.x * 0.1) * 0.012 / max(d, 0.003);
  }
  col = 1.0 - exp(-col * 0.9);
  gl_FragColor = vec4(col, 1.0);
}`,
  metaballs: `
void main() {
  vec2 uv = centered();
  float t = u_time;
  float f = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 p = vec2(sin(t * (0.45 + fi * 0.11) + fi * 1.7), cos(t * (0.38 + fi * 0.09) + fi * 2.3)) * 0.65;
    vec2 d = uv - p;
    f += 0.045 / dot(d, d);
  }
  vec2 dp = uv - u_pointer;
  f += 0.07 / dot(dp, dp);
  float body = smoothstep(0.95, 1.05, f);
  float rim = smoothstep(0.8, 0.95, f) - body;
  vec3 col = mix(vec3(0.02, 0.03, 0.09), palette(f * 0.05 + t * 0.05 + uv.y * 0.2), body);
  col += rim * vec3(0.9, 0.5, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`,
} as const;

export type ShaderName = keyof typeof shaders;

export interface GLInfo {
  version: string;
  renderer: string;
  vendor: string;
  shadingLanguage: string;
  maxTextureSize: number;
}

export interface ShaderGallery extends DemoInstance {
  setShader(name: ShaderName): void;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader failed to compile: ${log}`);
  }
  return shader;
}

/**
 * Raw WebGL 1: one full-screen triangle and a fragment shader per effect,
 * fed time, resolution and the pointer as uniforms.
 */
export function shaderGallery(
  options: { shader?: ShaderName; onInfo?: (info: GLInfo) => void; timeScale?: number } = {},
): Demo<ShaderGallery> {
  return (canvas, size) => {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false }) as WebGLRenderingContext;
    if (!gl) {
      throw new Error('WebGL is not available on this device.');
    }
    let { width, height } = size;
    const timeScale = options.timeScale ?? 1;

    options.onInfo?.({
      version: String(gl.getParameter(gl.VERSION)),
      renderer: String(gl.getParameter(gl.RENDERER)),
      vendor: String(gl.getParameter(gl.VENDOR)),
      shadingLanguage: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
      maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
    });

    const vertex = compile(
      gl,
      gl.VERTEX_SHADER,
      'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }',
    );

    // One triangle that covers the whole viewport.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const programs = new Map<ShaderName, { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation> }>();
    function program(name: ShaderName) {
      let entry = programs.get(name);
      if (!entry) {
        const fragment = compile(gl, gl.FRAGMENT_SHADER, HEADER + shaders[name]);
        const p = gl.createProgram()!;
        gl.attachShader(p, vertex);
        gl.attachShader(p, fragment);
        gl.bindAttribLocation(p, 0, 'a_position');
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
          throw new Error(`Program failed to link: ${gl.getProgramInfoLog(p)}`);
        }
        gl.deleteShader(fragment);
        entry = {
          program: p,
          uniforms: {
            resolution: gl.getUniformLocation(p, 'u_resolution'),
            time: gl.getUniformLocation(p, 'u_time'),
            pointer: gl.getUniformLocation(p, 'u_pointer'),
          },
        };
        programs.set(name, entry);
      }
      return entry;
    }

    let current = program(options.shader ?? 'plasma');
    // Eased towards `target`, so the effect glides after the finger.
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    return {
      frame(time) {
        pointer.x += (target.x - pointer.x) * 0.08;
        pointer.y += (target.y - pointer.y) * 0.08;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.useProgram(current.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(current.uniforms.resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
        // Wrapped so float precision holds up in long sessions.
        gl.uniform1f(current.uniforms.time, ((time / 1000) * timeScale) % 3600);
        gl.uniform2f(current.uniforms.pointer, pointer.x, pointer.y);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      resize(w, h) {
        width = w;
        height = h;
      },
      pointer(type, x, y) {
        if (type === 'up') {
          return;
        }
        // Same space as centered(): the short side spans -1..1, y points up.
        const m = Math.min(width, height);
        target.x = (x * 2 - width) / m;
        target.y = (height - y * 2) / m;
      },
      setShader(name) {
        current = program(name);
      },
      dispose() {
        for (const { program: p } of programs.values()) {
          gl.deleteProgram(p);
        }
        gl.deleteShader(vertex);
        gl.deleteBuffer(buffer);
      },
    };
  };
}
