import {
  GPUBufferUsage,
  type GPU,
  type GPUBindGroup,
  type GPUBuffer,
  type GPUCanvasContext,
  type GPUDevice,
} from '@nativescript/canvas';
import type { Demo, DemoInstance } from '../runner';

// Adapted from the WebGPU samples' "Compute Boids"
// (https://webgpu.github.io/webgpu-samples/?sample=computeBoids).
const spriteWGSL = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(4) color : vec4f,
}

// x: horizontal correction for the canvas aspect ratio, y: sprite size.
@group(0) @binding(0) var<uniform> view : vec4f;

@vertex
fn vert_main(
  @location(0) a_particlePos : vec2f,
  @location(1) a_particleVel : vec2f,
  @location(2) a_pos : vec2f
) -> VertexOutput {
  let angle = -atan2(a_particleVel.x, a_particleVel.y);
  let local = a_pos * view.y;
  let pos = vec2(
    (local.x * cos(angle)) - (local.y * sin(angle)),
    (local.x * sin(angle)) + (local.y * cos(angle))
  );

  var output : VertexOutput;
  output.position = vec4(vec2(pos.x * view.x, pos.y) + a_particlePos, 0.0, 1.0);
  let speed = length(a_particleVel) * 10.0;
  output.color = vec4(
    0.45 + 0.55 * sin(angle + 1.0),
    0.35 + 0.35 * speed,
    0.75 + 0.25 * cos(angle + 0.5),
    1.0);
  return output;
}

@fragment
fn frag_main(@location(4) color : vec4f) -> @location(0) vec4f {
  return color;
}
`;

const updateWGSL = /* wgsl */ `
struct Particle {
  pos : vec2f,
  vel : vec2f,
}
struct SimParams {
  deltaT : f32,
  rule1Distance : f32,
  rule2Distance : f32,
  rule3Distance : f32,
  rule1Scale : f32,
  rule2Scale : f32,
  rule3Scale : f32,
  pointerStrength : f32,
  pointer : vec2f,
}
struct Particles {
  particles : array<Particle>,
}
@binding(0) @group(0) var<uniform> params : SimParams;
@binding(1) @group(0) var<storage, read> particlesA : Particles;
@binding(2) @group(0) var<storage, read_write> particlesB : Particles;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id : vec3u) {
  let index = id.x;
  let count = arrayLength(&particlesA.particles);
  if (index >= count) {
    return;
  }

  var vPos = particlesA.particles[index].pos;
  var vVel = particlesA.particles[index].vel;
  var cMass = vec2(0.0);
  var cVel = vec2(0.0);
  var colVel = vec2(0.0);
  var cMassCount = 0u;
  var cVelCount = 0u;

  for (var i = 0u; i < count; i++) {
    if (i == index) {
      continue;
    }
    let pos = particlesA.particles[i].pos;
    let vel = particlesA.particles[i].vel;
    let d = distance(pos, vPos);
    if (d < params.rule1Distance) {
      cMass += pos;
      cMassCount++;
    }
    if (d < params.rule2Distance) {
      colVel -= pos - vPos;
    }
    if (d < params.rule3Distance) {
      cVel += vel;
      cVelCount++;
    }
  }
  if (cMassCount > 0u) {
    cMass = (cMass / vec2(f32(cMassCount))) - vPos;
  }
  if (cVelCount > 0u) {
    cVel /= f32(cVelCount);
  }
  vVel += (cMass * params.rule1Scale) + (colVel * params.rule2Scale) + (cVel * params.rule3Scale);

  if (params.pointerStrength > 0.0) {
    let toPointer = params.pointer - vPos;
    let d = max(length(toPointer), 0.05);
    vVel += normalize(toPointer) * params.pointerStrength / (d * 40.0);
  }

  vVel = normalize(vVel) * clamp(length(vVel), 0.0, 0.1);
  vPos = vPos + (vVel * params.deltaT);

  if (vPos.x < -1.0) { vPos.x = 1.0; }
  if (vPos.x > 1.0) { vPos.x = -1.0; }
  if (vPos.y < -1.0) { vPos.y = 1.0; }
  if (vPos.y > 1.0) { vPos.y = -1.0; }

  particlesB.particles[index].pos = vPos;
  particlesB.particles[index].vel = vVel;
}
`;

export const boidPresets = {
  flock: { deltaT: 0.04, rule1Distance: 0.1, rule2Distance: 0.025, rule3Distance: 0.025, rule1Scale: 0.02, rule2Scale: 0.05, rule3Scale: 0.005 },
  swarm: { deltaT: 0.05, rule1Distance: 0.2, rule2Distance: 0.02, rule3Distance: 0.08, rule1Scale: 0.04, rule2Scale: 0.1, rule3Scale: 0.02 },
  drift: { deltaT: 0.02, rule1Distance: 0.05, rule2Distance: 0.03, rule3Distance: 0.1, rule1Scale: 0.005, rule2Scale: 0.03, rule3Scale: 0.03 },
} as const;

export type BoidPreset = keyof typeof boidPresets;

export interface GPUInfo {
  vendor: string;
  architecture: string;
  description: string;
  format: string;
}

export interface Boids extends DemoInstance {
  setPreset(preset: BoidPreset): void;
  /** Scatters the flock again. */
  reset(): void;
}

/**
 * WebGPU compute: every frame a compute pass steers each boid from its
 * neighbours (and your finger), then an instanced render pass draws them.
 */
export function boids(
  options: { count?: number; preset?: BoidPreset; onInfo?: (info: GPUInfo) => void } = {},
): Demo<Boids> {
  return async (canvas, size) => {
    const gpu = (globalThis as any).navigator?.gpu as GPU | undefined;
    if (!gpu) {
      throw new Error('WebGPU is not available on this device.');
    }
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) {
      throw new Error('No WebGPU adapter was found.');
    }
    const device: GPUDevice = await adapter.requestDevice();
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    const format = gpu.getPreferredCanvasFormat();
    const configure = () => context.configure({ device, format, alphaMode: 'opaque' });
    configure();

    try {
      const info = await adapter.requestAdapterInfo();
      options.onInfo?.({
        vendor: String(info.vendor || 'unknown'),
        architecture: String(info.architecture || 'unknown'),
        description: String(info.description || ''),
        format,
      });
    } catch {
      options.onInfo?.({ vendor: 'unknown', architecture: 'unknown', description: '', format });
    }

    let { width, height } = size;
    const count = options.count ?? 1500;

    const spriteModule = device.createShaderModule({ code: spriteWGSL });
    const renderPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: spriteModule,
        entryPoint: 'vert_main',
        buffers: [
          {
            // Instanced particle data: position and velocity.
            arrayStride: 4 * 4,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 2 * 4, format: 'float32x2' },
            ],
          },
          {
            // The triangle every boid is drawn with.
            arrayStride: 2 * 4,
            stepMode: 'vertex',
            attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }],
          },
        ],
      },
      fragment: {
        module: spriteModule,
        entryPoint: 'frag_main',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    const computePipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: device.createShaderModule({ code: updateWGSL }),
        entryPoint: 'main',
      },
    });

    const vertexData = new Float32Array([-0.01, -0.02, 0.01, -0.02, 0.0, 0.02]);
    const spriteBuffer = device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(spriteBuffer.getMappedRange()).set(vertexData);
    spriteBuffer.unmap();

    const viewBuffer = device.createBuffer({
      size: 4 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const viewBindGroup = device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: viewBuffer } }],
    });
    function writeView() {
      // Keep boids the same physical size on any canvas shape.
      device.queue.writeBuffer(viewBuffer, 0, new Float32Array([height / width, 1.4, 0, 0]));
    }
    writeView();

    // 10 floats, padded to a multiple of 16 bytes.
    const simBuffer = device.createBuffer({
      size: 12 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    let preset: (typeof boidPresets)[BoidPreset] = boidPresets[options.preset ?? 'flock'];
    const pointer = { x: 0, y: 0, active: false };
    const simData = new Float32Array(12);
    function writeSim() {
      simData.set([
        preset.deltaT,
        preset.rule1Distance,
        preset.rule2Distance,
        preset.rule3Distance,
        preset.rule1Scale,
        preset.rule2Scale,
        preset.rule3Scale,
        pointer.active ? 0.004 : 0,
        pointer.x,
        pointer.y,
      ]);
      device.queue.writeBuffer(simBuffer, 0, simData);
    }
    writeSim();

    const particleBytes = count * 4 * 4;
    const particleBuffers: GPUBuffer[] = [0, 1].map(() =>
      device.createBuffer({
        size: particleBytes,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    );
    function reset() {
      const data = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        data[4 * i + 0] = 2 * (Math.random() - 0.5);
        data[4 * i + 1] = 2 * (Math.random() - 0.5);
        data[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.1;
        data[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.1;
      }
      device.queue.writeBuffer(particleBuffers[0], 0, data);
      device.queue.writeBuffer(particleBuffers[1], 0, data);
    }
    reset();

    const bindGroups: GPUBindGroup[] = [0, 1].map((i) =>
      device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: simBuffer } },
          { binding: 1, resource: { buffer: particleBuffers[i], offset: 0, size: particleBytes } },
          { binding: 2, resource: { buffer: particleBuffers[(i + 1) % 2], offset: 0, size: particleBytes } },
        ],
      }),
    );

    let t = 0;
    return {
      frame() {
        const texture = context.getCurrentTexture();
        if (!texture) {
          return;
        }
        const encoder = device.createCommandEncoder();

        const compute = encoder.beginComputePass();
        compute.setPipeline(computePipeline);
        compute.setBindGroup(0, bindGroups[t % 2]);
        compute.dispatchWorkgroups(Math.ceil(count / 64));
        compute.end();

        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: texture.createView(),
              clearValue: [0.008, 0.024, 0.09, 1],
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        });
        pass.setPipeline(renderPipeline);
        pass.setBindGroup(0, viewBindGroup);
        pass.setVertexBuffer(0, particleBuffers[(t + 1) % 2]);
        pass.setVertexBuffer(1, spriteBuffer);
        pass.draw(3, count, 0, 0);
        pass.end();

        device.queue.submit([encoder.finish()]);
        t++;
      },
      resize(w, h) {
        width = w;
        height = h;
        configure();
        writeView();
      },
      pointer(type, x, y) {
        pointer.active = type !== 'up';
        pointer.x = (x / width) * 2 - 1;
        pointer.y = 1 - (y / height) * 2;
        writeSim();
      },
      setPreset(name) {
        preset = boidPresets[name];
        writeSim();
      },
      reset,
      dispose() {
        context.unconfigure();
        for (const buffer of [...particleBuffers, spriteBuffer, viewBuffer, simBuffer]) {
          buffer.destroy();
        }
        device.destroy();
      },
    };
  };
}
