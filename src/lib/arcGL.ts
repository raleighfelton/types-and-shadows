// WebGL2 renderer for the cross-reference field. Each arc is one instance of
// a shared line strip; the vertex shader bends it into a half-ellipse and
// colors it by span. Dark theme: additive blending, so overlaps glow like
// light. Light theme: ordinary layering, so overlaps build toward the true
// hue like washes of watercolor instead of muddying toward black.

import { LIGHT_GAMMA, STOPS } from "./palette";

const SEGMENTS = 56;
const LIGHT_GAIN = 2.2;

const VS = `#version 300 es
in float a_t;
in vec3 a_arc; // x1 (0..1), x2 (0..1), votes
uniform vec2 u_res;
uniform float u_padL;
uniform float u_span;
uniform float u_baseY;
uniform float u_hs;
uniform float u_alpha;
uniform float u_light;
out vec4 v_color;

// Rainbow stops come from palette.ts (STOPS), shared with the 2D canvas.
const float P[${STOPS.length}] = float[${STOPS.length}](${STOPS.map(([p]) => p.toFixed(3)).join(", ")});
const vec3 C[${STOPS.length}] = vec3[${STOPS.length}](${STOPS.map(([, c]) => `vec3(${c.map((v) => v.toFixed(3)).join(", ")})`).join(", ")});

vec3 palette(float s) {
  if (s <= P[0]) return C[0];
  for (int i = 1; i < ${STOPS.length}; i++) {
    if (s <= P[i]) return mix(C[i - 1], C[i], (s - P[i - 1]) / (P[i] - P[i - 1]));
  }
  return C[${STOPS.length - 1}];
}

void main() {
  float x1 = u_padL + a_arc.x * u_span;
  float x2 = u_padL + a_arc.y * u_span;
  float cx = (x1 + x2) * 0.5;
  float r = abs(x2 - x1) * 0.5;
  float th = 3.14159265 * (1.0 - a_t);
  float x = cx + r * cos(th);
  float y = u_baseY - r * sin(th) * u_hs;
  gl_Position = vec4(x / u_res.x * 2.0 - 1.0, 1.0 - y / u_res.y * 2.0, 0.0, 1.0);
  float s = sqrt(abs(a_arc.y - a_arc.x));
  float w = clamp(0.35 + log(max(a_arc.z, 1.0)) * 0.22, 0.25, 1.6);
  // Short arcs pile up densely; let them carry less light each.
  w *= mix(0.4, 1.0, smoothstep(0.0, 0.45, s));
  vec3 p = palette(s);
  vec3 c = u_light > 0.5 ? pow(p, vec3(${LIGHT_GAMMA.toFixed(3)})) : p;
  v_color = vec4(c, u_alpha * w);
}`;

const FS = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 outColor;
void main() { outColor = v_color; }`;

/**
 * Arcs are never drawn denser than this. Lines are one device pixel wide, so
 * density sets how they look; posters draw at this cap and scale the result,
 * so they match the live map at any size.
 */
export const MAX_DPR = 2;

/** On denser screens each line is brightened a little to read the same. */
function resolutionGain(dpr: number) {
  return Math.sqrt(dpr);
}

export type ArcLayout = { width: number; height: number; padL: number; span: number; baseY: number; hs: number };

export class ArcGL {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private inst: WebGLBuffer;
  private tBuf: WebGLBuffer;
  private u: Record<string, WebGLUniformLocation | null> = {};
  count = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.prog = link(gl, VS, FS);
    for (const n of ["u_res", "u_padL", "u_span", "u_baseY", "u_hs", "u_alpha", "u_light"]) {
      this.u[n] = gl.getUniformLocation(this.prog, n);
    }
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    const t = new Float32Array(SEGMENTS + 1).map((_, i) => i / SEGMENTS);
    this.tBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuf);
    gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
    const aT = gl.getAttribLocation(this.prog, "a_t");
    gl.enableVertexAttribArray(aT);
    gl.vertexAttribPointer(aT, 1, gl.FLOAT, false, 0, 0);

    this.inst = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
    const aArc = gl.getAttribLocation(this.prog, "a_arc");
    gl.enableVertexAttribArray(aArc);
    gl.vertexAttribPointer(aArc, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aArc, 1);
    gl.bindVertexArray(null);
  }

  /** Releases GPU resources. The context itself is kept: a lost context can't
   *  be revived, and React may mount again on the same canvas. */
  dispose() {
    const { gl } = this;
    gl.deleteBuffer(this.inst);
    gl.deleteBuffer(this.tBuf);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.prog);
  }

  /** The canvas this renders into (to copy the result elsewhere). */
  get canvasElement() {
    return this.canvas;
  }

  /** For throwaway renderers (posters): frees the buffers, the context and the pixels. */
  destroy() {
    this.dispose();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.width = this.canvas.height = 0;
  }

  /** data: [x1n, x2n, votes] per arc, already sorted for reveal order. */
  private data: Float32Array | null = null;
  setArcs(data: Float32Array) {
    if (data === this.data) return;
    this.data = data;
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.count = data.length / 3;
  }

  draw(layout: ArcLayout, density: number, alpha: number, bg: [number, number, number], light: boolean, upTo = this.count) {
    const { gl, canvas } = this;
    const dpr = Math.min(density, MAX_DPR);
    const w = Math.round(layout.width * dpr);
    const h = Math.round(layout.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    if (light) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
    gl.useProgram(this.prog);
    gl.uniform2f(this.u.u_res, layout.width, layout.height);
    gl.uniform1f(this.u.u_padL, layout.padL);
    gl.uniform1f(this.u.u_span, layout.span);
    gl.uniform1f(this.u.u_baseY, layout.baseY);
    gl.uniform1f(this.u.u_hs, layout.hs);
    // Thinner device pixels need a little more light to read the same.
    // Layered color needs more pigment per line than added light does.
    gl.uniform1f(this.u.u_alpha, alpha * resolutionGain(dpr) * (light ? LIGHT_GAIN : 1));
    gl.uniform1f(this.u.u_light, light ? 1 : 0);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, SEGMENTS + 1, Math.min(upTo, this.count));
    gl.bindVertexArray(null);
  }
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
  return p;
}
