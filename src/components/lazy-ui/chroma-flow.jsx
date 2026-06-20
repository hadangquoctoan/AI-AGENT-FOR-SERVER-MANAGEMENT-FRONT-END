"use client";

import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

#define MAX_STOPS 6

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_density;
uniform float u_flow;
uniform float u_glow;
uniform float u_vignette;
uniform float u_grain;
uniform int u_mouseFollow;
uniform float u_mouseInfluence;
uniform vec3 u_stops[MAX_STOPS];
uniform int u_stopCount;
uniform vec3 u_bg;

in vec2 v_uv;
out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + 5.1;
    a *= 0.55;
  }
  return v;
}

vec2 flowVec(vec2 p, float t) {
  return vec2(
    sin(p.y * 1.4 + t * 0.45) * 0.5 + sin(p.y * 0.55 - t * 0.3) * 0.35,
    cos(p.x * 1.2 - t * 0.5) * 0.4
  );
}

vec3 sampleStops(float t) {
  int n = u_stopCount;
  if (n <= 1) return u_stops[0];
  t = clamp(t, 0.0, 1.0);
  float scaled = t * float(n - 1);
  int idx = int(floor(scaled));
  int next = idx + 1;
  if (next > n - 1) next = n - 1;
  float frac = scaled - float(idx);
  return mix(u_stops[idx], u_stops[next], frac);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 st = uv * 2.0 - 1.0;
  st.x *= aspect;
  float t = u_time * u_speed;

  vec2 fv = flowVec(st * 2.0, t);
  float warp = (fbm(st * 1.3 + vec2(t * 0.1, -t * 0.07)) - 0.5) * 0.9;
  float xWarp = (fv.x * 0.6 + warp) * u_flow;

  float ring = 0.0;
  if (u_mouseFollow == 1) {
    vec2 toMouse = uv - u_mouse;
    vec2 toMouseA = toMouse * vec2(aspect, 1.0);
    float md = length(toMouseA);
    vec2 dir = md > 0.001 ? toMouseA / md : vec2(0.0, 0.0);
    float ringR = 0.24;
    float ringW = 0.16;
    ring = exp(-pow(md - ringR, 2.0) / (ringW * ringW));
    xWarp += -dir.y * ring * u_mouseInfluence * 0.95;
    xWarp += -dir.x * ring * u_mouseInfluence * 0.22;
  }

  float s1 = sin((st.x + xWarp) * u_density + t * 1.8) * 0.5 + 0.5;
  float s2 = sin((st.x + xWarp * 0.7) * u_density * 1.7 - t * 1.2) * 0.5 + 0.5;
  float s3 = sin((st.x + xWarp * 1.2) * u_density * 2.6 + t * 2.4) * 0.5 + 0.5;
  s1 = pow(s1, 1.4);
  s2 = pow(s2, 2.2);
  s3 = pow(s3, 3.4);
  float streaks = s1 * 0.55 + s2 * 0.35 + s3 * 0.22;

  float gy = clamp(uv.y + fv.y * 0.16, 0.0, 1.0);
  vec3 baseColor = sampleStops(1.0 - gy);

  float intensity = streaks + ring * 0.22 * u_mouseInfluence;

  float bloom = smoothstep(0.55, 1.0, streaks) * u_glow;
  intensity += bloom;
  intensity = clamp(intensity, 0.0, 1.6);

  vec3 result = mix(u_bg, baseColor, smoothstep(0.0, 0.35, intensity));
  result += baseColor * (intensity - smoothstep(0.0, 0.35, intensity)) * 0.6;

  float vig = 1.0 - length(uv - 0.5) * 0.95 * u_vignette;
  result *= smoothstep(0.05, 1.0, vig);

  if (u_grain > 0.0) {
    float gate = smoothstep(0.05, 0.4, intensity);
    float n = hash21(gl_FragCoord.xy + t * 60.0) - 0.5;
    result += n * u_grain * gate;
  }

  fragColor = vec4(result, 1.0);
}
`;

const PALETTES = {
  electric: {
    stops: [
      [1.0, 0.18, 0.6],
      [0.9, 0.25, 1.0],
      [0.2, 0.5, 1.0],
      [0.15, 1.0, 0.92],
    ],
    bg: [0.015, 0.01, 0.06],
  },
  aurora: {
    stops: [
      [0.15, 0.95, 0.55],
      [0.2, 0.85, 0.85],
      [0.45, 0.4, 1.0],
      [0.1, 0.45, 1.0],
    ],
    bg: [0.0, 0.015, 0.05],
  },
  sunset: {
    stops: [
      [1.0, 0.52, 0.6],
      [1.0, 0.42, 0.2],
      [0.9, 0.2, 0.6],
      [0.3, 0.15, 0.65],
    ],
    bg: [0.035, 0.005, 0.06],
  },
  ocean: {
    stops: [
      [0.15, 0.9, 0.95],
      [0.2, 0.7, 0.95],
      [0.05, 0.35, 0.85],
      [0.0, 0.15, 0.45],
    ],
    bg: [0.0, 0.02, 0.06],
  },
  void: {
    stops: [
      [0.55, 0.3, 0.85],
      [0.3, 0.15, 0.7],
      [0.15, 0.1, 0.45],
      [0.05, 0.05, 0.2],
    ],
    bg: [0.0, 0.0, 0.04],
  },
  silver: {
    stops: [
      [0.95, 0.95, 0.97],
      [0.65, 0.65, 0.7],
      [0.35, 0.35, 0.4],
      [0.12, 0.12, 0.15],
    ],
    bg: [0.01, 0.01, 0.02],
  },
};

const MAX_STOPS = 6;

function parseColor(input, fallback) {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "transparent" || trimmed === "none") return [0, 0, 0];
  const hex = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(trimmed);
  if (hex) {
    return [
      parseInt(hex[1], 16) / 255,
      parseInt(hex[2], 16) / 255,
      parseInt(hex[3], 16) / 255,
    ];
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(trimmed);
  if (rgb) {
    return [
      Math.min(255, parseInt(rgb[1], 10)) / 255,
      Math.min(255, parseInt(rgb[2], 10)) / 255,
      Math.min(255, parseInt(rgb[3], 10)) / 255,
    ];
  }
  const hsl = /^hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/i.exec(trimmed);
  if (hsl) {
    return hslToRgb(
      parseInt(hsl[1], 10),
      parseInt(hsl[2], 10) / 100,
      parseInt(hsl[3], 10) / 100,
    );
  }
  return fallback;
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

function rgbToCss([r, g, b]) {
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("ChromaFlow compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function linkProgram(gl, vs, fs) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("ChromaFlow link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function ChromaFlow({
  children,
  palette = "sunset",
  colors,
  backgroundColor,
  speed = 0.5,
  density = 13,
  flow = 1,
  glow = 0.55,
  vignette = 0.55,
  grain = 0.04,
  mouseFollow = true,
  mouseInfluence = 0.5,
  className,
  style,
  onPointerMove,
  onPointerLeave,
  ...rest
}) {
  const reduced = useReducedMotion();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const paramsRef = useRef({
    palette,
    colors,
    backgroundColor,
    speed,
    density,
    flow,
    glow,
    vignette,
    grain,
    mouseFollow,
    mouseInfluence,
  });
  useEffect(() => {
    paramsRef.current = {
      palette,
      colors,
      backgroundColor,
      speed,
      density,
      flow,
      glow,
      vignette,
      grain,
      mouseFollow,
      mouseInfluence,
    };
  }, [
    palette,
    colors,
    backgroundColor,
    speed,
    density,
    flow,
    glow,
    vignette,
    grain,
    mouseFollow,
    mouseInfluence,
  ]);

  const mouseTargetRef = useRef({ x: 0.5, y: 0.5, active: false });
  const mouseSmoothedRef = useRef({ x: 0.5, y: 0.5 });
  const pointerActiveRef = useRef(0);
  const smoothedRef = useRef({
    speed,
    density,
    flow,
    glow,
    vignette,
    grain,
    mouseInfluence,
  });

  useEffect(() => {
    if (reduced) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) {
      console.warn("ChromaFlow: WebGL2 unavailable — static fallback shown.");
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const program = linkProgram(gl, vs, fs);
    if (!program) return;
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const loc = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      mouse: gl.getUniformLocation(program, "u_mouse"),
      speed: gl.getUniformLocation(program, "u_speed"),
      density: gl.getUniformLocation(program, "u_density"),
      flow: gl.getUniformLocation(program, "u_flow"),
      glow: gl.getUniformLocation(program, "u_glow"),
      vignette: gl.getUniformLocation(program, "u_vignette"),
      grain: gl.getUniformLocation(program, "u_grain"),
      mouseFollow: gl.getUniformLocation(program, "u_mouseFollow"),
      mouseInfluence: gl.getUniformLocation(program, "u_mouseInfluence"),
      stops: gl.getUniformLocation(program, "u_stops[0]"),
      stopCount: gl.getUniformLocation(program, "u_stopCount"),
      bg: gl.getUniformLocation(program, "u_bg"),
    };

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const start = performance.now();
    let raf = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
      });
    });
    ro.observe(container);
    resize();

    let visible = true;
    let pageVisible = typeof document !== "undefined" ? !document.hidden : true;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        visible = !!entry && entry.isIntersecting && entry.intersectionRatio > 0;
      },
      { threshold: [0, 0.01] },
    );
    io.observe(container);
    const handleVisibility = () => {
      pageVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const stopBuffer = new Float32Array(MAX_STOPS * 3);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || !pageVisible) return;

      const p = paramsRef.current;
      const spec = PALETTES[p.palette] ?? PALETTES.electric;

      const rawColors = p.colors && p.colors.length > 0 ? p.colors : null;
      const stopCount = rawColors
        ? Math.min(MAX_STOPS, Math.max(2, rawColors.length))
        : Math.min(MAX_STOPS, spec.stops.length);
      for (let i = 0; i < MAX_STOPS; i++) {
        const src =
          i < stopCount
            ? rawColors
              ? parseColor(rawColors[i], spec.stops[i] ?? spec.stops[0])
              : spec.stops[i]
            : spec.stops[Math.min(spec.stops.length - 1, i)];
        stopBuffer[i * 3] = src[0];
        stopBuffer[i * 3 + 1] = src[1];
        stopBuffer[i * 3 + 2] = src[2];
      }

      const bg = p.backgroundColor
        ? parseColor(p.backgroundColor, spec.bg)
        : spec.bg;

      const elapsed = (performance.now() - start) / 1000;
      const target = mouseTargetRef.current;
      const smoothed = mouseSmoothedRef.current;
      const easeRate = target.active ? 0.14 : 0.04;
      smoothed.x += (target.x - smoothed.x) * easeRate;
      smoothed.y += (target.y - smoothed.y) * easeRate;

      const activeTarget = target.active ? 1 : 0;
      pointerActiveRef.current +=
        (activeTarget - pointerActiveRef.current) * (target.active ? 0.18 : 0.05);

      const s = smoothedRef.current;
      const sLerp = 0.12;
      s.speed += (p.speed - s.speed) * sLerp;
      s.density += (p.density - s.density) * sLerp;
      s.flow += (p.flow - s.flow) * sLerp;
      s.glow += (p.glow - s.glow) * sLerp;
      s.vignette += (p.vignette - s.vignette) * sLerp;
      s.grain += (p.grain - s.grain) * sLerp;
      s.mouseInfluence += (p.mouseInfluence - s.mouseInfluence) * sLerp;

      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(loc.resolution, canvas.width, canvas.height);
      gl.uniform1f(loc.time, elapsed);
      gl.uniform2f(loc.mouse, smoothed.x, smoothed.y);
      gl.uniform1f(loc.speed, s.speed);
      gl.uniform1f(loc.density, Math.max(1, s.density));
      gl.uniform1f(loc.flow, Math.max(0, Math.min(1, s.flow)));
      gl.uniform1f(loc.glow, Math.max(0, Math.min(1, s.glow)));
      gl.uniform1f(loc.vignette, Math.max(0, Math.min(1, s.vignette)));
      gl.uniform1f(loc.grain, Math.max(0, Math.min(0.2, s.grain)));
      gl.uniform1i(loc.mouseFollow, p.mouseFollow ? 1 : 0);
      gl.uniform1f(loc.mouseInfluence, Math.max(0, s.mouseInfluence) * pointerActiveRef.current);
      gl.uniform3fv(loc.stops, stopBuffer);
      gl.uniform1i(loc.stopCount, stopCount);
      gl.uniform3f(loc.bg, bg[0], bg[1], bg[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
      setTimeout(() => {
        if (!canvas.isConnected)
          gl.getExtension("WEBGL_lose_context")?.loseContext();
      }, 0);
    };
  }, [reduced]);

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseTargetRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: 1 - (e.clientY - rect.top) / rect.height,
      active: true,
    };
    onPointerMove?.(e);
  };

  const handlePointerLeave = (e) => {
    mouseTargetRef.current = { x: 0.5, y: 0.5, active: false };
    onPointerLeave?.(e);
  };

  const fallbackSpec = PALETTES[palette] ?? PALETTES.electric;
  const fallbackStops = colors && colors.length > 0 ? colors : fallbackSpec.stops.map(rgbToCss);
  const bgCss = backgroundColor ?? rgbToCss(fallbackSpec.bg);
  const fallbackBg = `linear-gradient(180deg, ${fallbackStops.join(", ")}), ${bgCss}`;

  const rootStyle = {
    background: reduced ? fallbackBg : bgCss,
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className ?? ""}`}
      style={rootStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...rest}
    >
      {!reduced && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

ChromaFlow.displayName = "ChromaFlow";
