import React, { useEffect, useRef, useState } from 'react';

interface FluidBackgroundProps {
  scrollProgress: number;
}

export const FluidBackground: React.FC<FluidBackgroundProps> = ({ scrollProgress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const scrollProgressRef = useRef(scrollProgress);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep scrollProgress ref updated for use in the animation loop
  useEffect(() => {
    scrollProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Initialize WebGL context
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn('WebGL not supported, falling back to 2D.');
      return;
    }

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 1. CPU Fluid Simulation Grid (64x64 resolution for performance)
    const GRID_W = 64;
    const GRID_H = 64;
    const totalCells = GRID_W * GRID_H;

    // Velocity grids
    let u = new Float32Array(totalCells);
    let v = new Float32Array(totalCells);

    // Paint Density grids (Red = Sage Green, Green = Purple Mist)
    let dSage = new Float32Array(totalCells);
    let dSagePrev = new Float32Array(totalCells);
    let dSageInit = new Float32Array(totalCells);

    let dPurple = new Float32Array(totalCells);
    let dPurplePrev = new Float32Array(totalCells);
    let dPurpleInit = new Float32Array(totalCells);

    // Helper to zero out the simulation grid border cells to prevent rendering artifacts at the edges
    const clearBoundaries = (d: Float32Array) => {
      // Top and Bottom rows
      for (let cx = 0; cx < GRID_W; cx++) {
        d[cx] = 0.0;
        d[cx + (GRID_H - 1) * GRID_W] = 0.0;
      }
      // Left and Right columns
      for (let cy = 0; cy < GRID_H; cy++) {
        d[cy * GRID_W] = 0.0;
        d[(GRID_W - 1) + cy * GRID_W] = 0.0;
      }
    };

    // Initialize initial watercolor paint blobs (Initial density field layout)
    const initDensities = () => {
      for (let cy = 0; cy < GRID_H; cy++) {
        for (let cx = 0; cx < GRID_W; cx++) {
          const idx = cx + cy * GRID_W;
          const nx = cx / (GRID_W - 1);
          const ny = cy / (GRID_H - 1);

          // Center-clearance mask: 0 in center, 1 far away
          const distToCenter = Math.sqrt((nx - 0.5) * (nx - 0.5) + (ny - 0.5) * (ny - 0.5));
          const centerMask = Math.min(1.0, distToCenter * 2.5); // 0 at center, fades to 1.0 at r=0.4

          // Sage Green density: Radial gradient in bottom-left, top-right, and middle-left
          const dSage1 = Math.sqrt((nx - 0.2) * (nx - 0.2) + (ny - 0.25) * (ny - 0.25));
          const dSage2 = Math.sqrt((nx - 0.8) * (nx - 0.8) + (ny - 0.75) * (ny - 0.75));
          const dSage3 = Math.sqrt((nx - 0.15) * (nx - 0.15) + (ny - 0.6) * (ny - 0.6));
          const sageBase = Math.max(0, 0.9 - Math.min(dSage1, dSage2, dSage3) * 2.2);

          // Purple Mist density: Radial gradient in top-left, bottom-right, and top-center
          const dPurple1 = Math.sqrt((nx - 0.2) * (nx - 0.2) + (ny - 0.75) * (ny - 0.75));
          const dPurple2 = Math.sqrt((nx - 0.8) * (nx - 0.8) + (ny - 0.25) * (ny - 0.25));
          const dPurple3 = Math.sqrt((nx - 0.5) * (nx - 0.5) + (ny - 0.85) * (ny - 0.85));
          const purpleBase = Math.max(0, 0.85 - Math.min(dPurple1, dPurple2, dPurple3) * 2.0);

          dSageInit[idx] = sageBase * centerMask;
          dPurpleInit[idx] = purpleBase * centerMask;

          dSage[idx] = dSageInit[idx];
          dPurple[idx] = dPurpleInit[idx];
        }
      }
    };
    initDensities();
    clearBoundaries(dSageInit);
    clearBoundaries(dPurpleInit);
    clearBoundaries(dSage);
    clearBoundaries(dPurple);

    // 2. Compile WebGL Shaders & Program
    const vsSource = `
      attribute vec2 position;
      varying vec2 v_uv;
      void main() {
        v_uv = position * 0.5 + 0.5; // Fit UV mappings
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment Shader: fBm noise, domain warping, and watercolor bleeding filters
    const fsSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_fluid_texture;

      // 3D Noise generator
      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
      }

      // Smooth 3D noise interpolation
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(
            mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), u.x),
            mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), u.x),
            u.y
          ),
          mix(
            mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), u.x),
            mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), u.x),
            u.y
          ),
          u.z
        );
      }

      // 3D Fractional Brownian Motion (fBm) noise
      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        vec3 shift = vec3(100.0);
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p = p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      // Domain Warping using secondary fBm fields (3D phase/morphing space)
      vec2 warp(vec2 uv, float t, float aspect) {
        vec2 aspectUv = vec2(uv.x * aspect, uv.y);
        vec3 p = vec3(aspectUv * 2.8, t * 0.02); // Z-axis controls morph speed
        vec2 q = vec2(
          fbm(p),
          fbm(p + vec3(5.2, 1.3, 10.0))
        );
        vec3 p2 = vec3(aspectUv * 2.8, t * 0.01);
        vec2 r = vec2(
          fbm(p2 + vec3(4.0 * q + vec2(1.7, 9.2), 20.0)),
          fbm(p2 + vec3(4.0 * q + vec2(8.3, 2.8), 30.0))
        );
        return uv + 0.018 * r; // Keep texture coords mapping uv (0 to 1) offset by isotropic noise r
      }

      void main() {
        float aspect = u_resolution.x / u_resolution.y;
        vec2 aspectUv = vec2(v_uv.x * aspect, v_uv.y);

        // Warp UV slightly to keep fluid ripples organic without cursor offset displacement (morph in place)
        vec2 warpedUv = warp(v_uv, u_time, aspect);
        vec4 fluidSample = texture2D(u_fluid_texture, warpedUv);

        // Generate fBm noise for watercolor edge distortion (aspect-ratio corrected, morph in place)
        float n = fbm(vec3(aspectUv * 5.0, u_time * 0.03));
        
        // Add noise directly to the density fields to create feathered bleeding watercolor edges
        float sageDensity = fluidSample.r + (n - 0.5) * 0.12;
        float purpleDensity = fluidSample.g + (n - 0.5) * 0.12;

        // Define colors
        vec3 tanBg = vec3(0.902, 0.875, 0.827);       // Editorial Tan (#E6DFD3)
        vec3 sageGreen = vec3(0.541, 0.604, 0.525);   // Organic Sage (#8A9A86)
        vec3 purpleMist = vec3(0.431, 0.314, 0.490);  // Balanced Purple Ink (#6E507D)

        // Interpolate densities with smooth, feathered edges
        float sageVal = smoothstep(0.04, 0.62, sageDensity);
        float purpleVal = smoothstep(0.04, 0.62, purpleDensity);

        vec3 color = tanBg;
        color = mix(color, sageGreen, sageVal);
        color = mix(color, purpleMist, purpleVal);

        // Add soft organic paper fiber/grain texture (static Z to keep background texture stable)
        float grain = (noise(vec3(aspectUv * 800.0, 0.0)) - 0.5) * 0.024;
        color += vec3(grain);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad position mapping Buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const quadPositions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.STATIC_DRAW);

    const posAttrLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttrLoc);
    gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform mappings
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uResLoc = gl.getUniformLocation(program, 'u_resolution');

    // Create 64x64 dynamic texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Texture buffer size: 64 cols * 64 rows * 4 channels
    const textureBuffer = new Uint8Array(GRID_W * GRID_H * 4);

    // 3. Navier-Stokes / High-Viscosity Fluid Advection Logic
    const advect = (d: Float32Array, d0: Float32Array, velX: Float32Array, velY: Float32Array, dt: number) => {
      const dtX = dt * (GRID_W - 2);
      const dtY = dt * (GRID_H - 2);
      for (let cy = 1; cy < GRID_H - 1; cy++) {
        for (let cx = 1; cx < GRID_W - 1; cx++) {
          const idx = cx + cy * GRID_W;
          let srcX = cx - velX[idx] * dtX;
          let srcY = cy - velY[idx] * dtY;

          // Clamping boundaries
          if (srcX < 0.5) srcX = 0.5;
          if (srcX > GRID_W - 1.5) srcX = GRID_W - 1.5;
          if (srcY < 0.5) srcY = 0.5;
          if (srcY > GRID_H - 1.5) srcY = GRID_H - 1.5;

          const cx0 = Math.floor(srcX);
          const cx1 = cx0 + 1;
          const cy0 = Math.floor(srcY);
          const cy1 = cy0 + 1;

          const s1 = srcX - cx0;
          const s0 = 1 - s1;
          const t1 = srcY - cy0;
          const t0 = 1 - t1;

          d[idx] =
            s0 * (t0 * d0[cx0 + cy0 * GRID_W] + t1 * d0[cx0 + cy1 * GRID_W]) +
            s1 * (t0 * d0[cx1 + cy0 * GRID_W] + t1 * d0[cx1 + cy1 * GRID_W]);
        }
      }
    };

    // Mouse velocity state trackers
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastTime = Date.now();

    const handleMouseMove = (e: MouseEvent | PointerEvent | TouchEvent) => {
      // If fully hidden, do not register mouse movements
      if (scrollProgressRef.current >= 0.15) return;

      const now = Date.now();
      const dt = now - lastTime;
      if (dt === 0) return;

      let mx = 0;
      let my = 0;

      if ('clientX' in e) {
        mx = e.clientX;
        my = e.clientY;
      } else if ('touches' in e && e.touches.length > 0) {
        mx = e.touches[0].clientX;
        my = e.touches[0].clientY;
      } else {
        return;
      }

      const dx = mx - lastMouseX;
      const dy = my - lastMouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Find cell coordinates
      const cx = Math.floor((mx / width) * GRID_W);
      const cy = Math.floor(((height - my) / height) * GRID_H);

      if (dist > 1.5 && cx > 1 && cx < GRID_W - 2 && cy > 1 && cy < GRID_H - 2) {
        const radius = 3;
        for (let ny = -radius; ny <= radius; ny++) {
          for (let nx = -radius; nx <= radius; nx++) {
            const tx = cx + nx;
            const ty = cy + ny;
            const idx = tx + ty * GRID_W;

            const dDist = Math.sqrt(nx * nx + ny * ny);
            const force = Math.max(0, 1 - dDist / radius);

            // Inject velocity vectors
            u[idx] += (dx / dt) * force * 0.85;
            v[idx] += (-dy / dt) * force * 0.85;

            // Clear densities locally to create cutting / parting brush effects
            dSage[idx] = Math.max(0, dSage[idx] - force * 1.5);
            dPurple[idx] = Math.max(0, dPurple[idx] - force * 1.5);
          }
        }
      }

      lastMouseX = mx;
      lastMouseY = my;
      lastTime = now;
    };

    // Bind event listeners to global window object
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('pointermove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleMouseMove, { passive: true });

    // WebGL Frame rendering ticker
    let time = 0;
    const tick = () => {
      // If fully hidden, bypass simulation calculations and GL texture updates completely to optimize performance
      if (scrollProgressRef.current >= 0.15) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      time += 0.015;

      // 1. Viscosity & Velocity diffusion loop (smooth vector fields)
      const nextU = new Float32Array(totalCells);
      const nextV = new Float32Array(totalCells);
      const drag = 0.945; // Viscous friction decay

      for (let cy = 1; cy < GRID_H - 1; cy++) {
        for (let cx = 1; cx < GRID_W - 1; cx++) {
          const idx = cx + cy * GRID_W;
          // Inject continuous, low-magnitude internal forces (oscillating horizontal and vertical forces for breathing heartbeat)
          const uForce = Math.sin(time * 0.5) * 0.003;
          const vForce = Math.cos(time * 0.6 + cx * 0.15) * 0.003;

          const uAvg = (u[idx] * 4 + u[idx - 1] + u[idx + 1] + u[idx - GRID_W] + u[idx + GRID_W]) / 8 + uForce;
          const vAvg = (v[idx] * 4 + v[idx - 1] + v[idx + 1] + v[idx - GRID_W] + v[idx + GRID_W]) / 8 + vForce;

          nextU[idx] = uAvg * drag;
          nextV[idx] = vAvg * drag;
        }
      }
      u = nextU;
      v = nextV;

      // 2. Advect density arrays
      dSagePrev.set(dSage);
      advect(dSage, dSagePrev, u, v, 0.08);

      dPurplePrev.set(dPurple);
      advect(dPurple, dPurplePrev, u, v, 0.08);

      // Force boundary cells to 0 to prevent static artifact lines at the edges
      clearBoundaries(dSage);
      clearBoundaries(dPurple);

      // 3. Bleed densities slowly back to initial layouts
      const bleedRate = 0.009; // Rate of paint bleeding back together
      for (let i = 0; i < totalCells; i++) {
        dSage[i] += (dSageInit[i] - dSage[i]) * bleedRate;
        dPurple[i] += (dPurpleInit[i] - dPurple[i]) * bleedRate;

        // Pack values into texture bytes
        const s = Math.min(255, Math.max(0, Math.floor(dSage[i] * 255)));
        const p = Math.min(255, Math.max(0, Math.floor(dPurple[i] * 255)));
        
        const texIdx = i * 4;
        textureBuffer[texIdx] = s;     // R channel
        textureBuffer[texIdx + 1] = p; // G channel
        textureBuffer[texIdx + 2] = 0;
        textureBuffer[texIdx + 3] = 255;
      }

      // Also ensure the boundaries in textureBuffer are strictly zeroed out
      for (let cx = 0; cx < GRID_W; cx++) {
        const idxBottom = cx * 4;
        const idxTop = (cx + (GRID_H - 1) * GRID_W) * 4;
        textureBuffer[idxBottom] = 0;
        textureBuffer[idxBottom + 1] = 0;
        textureBuffer[idxTop] = 0;
        textureBuffer[idxTop + 1] = 0;
      }
      for (let cy = 0; cy < GRID_H; cy++) {
        const idxLeft = (cy * GRID_W) * 4;
        const idxRight = ((GRID_W - 1) + cy * GRID_W) * 4;
        textureBuffer[idxLeft] = 0;
        textureBuffer[idxLeft + 1] = 0;
        textureBuffer[idxRight] = 0;
        textureBuffer[idxRight + 1] = 0;
      }

      // 4. Update GPU texture
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GRID_W, GRID_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, textureBuffer);

      // 5. Draw full screen shader quad
      gl.viewport(0, 0, width, height);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform2f(uResLoc, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(tick);
    };
    tick();

    // Resize bindings
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Compute scroll-linked opacity to fade out the fluid gradient as the user scrolls
  const fadeFactor = Math.min(1, scrollProgress / 0.12); // Smoothly fades out over 12% scroll
  const opacity = (1 - fadeFactor) * (mounted ? 1 : 0);
  const isHidden = scrollProgress >= 0.15; // Set display: none when completely faded out

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        transform: 'scale(1.12)',
        transformOrigin: 'center center',
        zIndex: 1,
        pointerEvents: 'none',
        opacity: opacity,
        display: isHidden ? 'none' : 'block',
        transition: 'opacity 0.1s ease-out',
      }}
    />
  );
};

export default FluidBackground;
