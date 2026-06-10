import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NARRATIVE_SPLINE_TRACK, FRENET_FRAMES } from './SplineTrack';

const COUNT = 750; // Slashed density for editorial elegance

const COLORS = [
  new THREE.Color('#8A9A86'), // Organic Sage Green 1
  new THREE.Color('#9CB097'), // Organic Sage Green 2
  new THREE.Color('#A4A8A3'), // Textured Ash Grey 1
  new THREE.Color('#8C918A'), // Textured Ash Grey 2
];

// Choreographed camera-relative viewport-anchored "Invitation" Swoop
const getIntroSwoop = (
  leafP: number,
  time: number,
  camera: THREE.Camera,
  index: number,
  ribbonPos: THREE.Vector3
): THREE.Vector3 => {
  // Fetch camera local directions in world space
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

  // Emitter in bottom-right quadrant of camera space (7 units forward, 6 right, -3.5 up)
  const startPos = new THREE.Vector3()
    .copy(camera.position)
    .addScaledVector(forward, 7.0)
    .addScaledVector(right, 6.0)
    .addScaledVector(up, -3.5);

  // Stream effect: make leaves flow from this bottom-right point toward the ribbon position
  const leafProgressInStream = leafP / 0.15; // 0 to 1
  
  // Continuous stream flow over time
  const flowSpeed = 0.5;
  const flowOffset = (time * flowSpeed + index * 0.02) % 1.0;
  
  // Blend factor along the stream (0 at emitter, 1 at ribbon)
  const tBlend = THREE.MathUtils.clamp(leafProgressInStream + flowOffset, 0, 1);

  // Interpolate from bottom-right start position to the ribbon position
  return new THREE.Vector3().lerpVectors(startPos, ribbonPos, tBlend);
};

interface LeafStreamEngineProps {
  progressRef: React.MutableRefObject<number>;
  scrollProgress: number;
}

export const LeafStreamEngine: React.FC<LeafStreamEngineProps> = ({ progressRef, scrollProgress }) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const prevMouseRef = useRef(new THREE.Vector2(0, 0));
  const mouseVelocityRef = useRef(0);

  // Scroll Speed Tracking States
  const timeAccumulatorRef = useRef(0);

  // Flat physics simulation arrays
  const offsetProgressRef = useRef(new Float32Array(COUNT)); // Staggered offsets along spline
  const baseRadiiRef = useRef(new Float32Array(COUNT)); // Hollow tube base radius
  const offsetsRef = useRef(new Float32Array(COUNT * 2)); // 2D local offsets (Normal, Binormal)
  const velocitiesRef = useRef(new Float32Array(COUNT * 2)); // 2D local velocities (Normal, Binormal)
  const scalesRef = useRef(new Float32Array(COUNT));
  const rotationsRef = useRef(new Float32Array(COUNT * 3));
  const rotSpeedsRef = useRef(new Float32Array(COUNT * 3));

  // Initialize leaf geometry: organic oblong/tapered shape with a central crease spine
  const leafGeometry = React.useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // Left Half: spine -> edge -> spine
      // Triangle 1: Base spine -> Left edge 1/3 -> Spine 1/3
      0, 0, -0.2,       -0.05, 0.05, -0.07,  0, 0.02, -0.07,
      // Triangle 2: Spine 1/3 -> Left edge 1/3 -> Left edge 2/3
      0, 0.02, -0.07,   -0.05, 0.05, -0.07,  -0.08, 0.06, 0.07,
      // Triangle 3: Spine 1/3 -> Left edge 2/3 -> Spine 2/3
      0, 0.02, -0.07,   -0.08, 0.06, 0.07,   0, 0.03, 0.07,
      // Triangle 4: Spine 2/3 -> Left edge 2/3 -> Tip
      0, 0.03, 0.07,    -0.08, 0.06, 0.07,   0, 0, 0.2,

      // Right Half: spine -> edge -> spine
      // Triangle 5: Base spine -> Spine 1/3 -> Right edge 1/3
      0, 0, -0.2,       0, 0.02, -0.07,      0.05, 0.05, -0.07,
      // Triangle 6: Spine 1/3 -> Right edge 2/3 -> Right edge 1/3
      0, 0.02, -0.07,   0.08, 0.06, 0.07,    0.05, 0.05, -0.07,
      // Triangle 7: Spine 1/3 -> Spine 2/3 -> Right edge 2/3
      0, 0.02, -0.07,   0, 0.03, 0.07,       0.08, 0.06, 0.07,
      // Triangle 8: Spine 2/3 -> Tip -> Right edge 2/3
      0, 0.03, 0.07,    0, 0, 0.2,           0.08, 0.06, 0.07
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const uvs = new Float32Array([
      // Left Half
      0.5, 0.0,   0.0, 0.33,  0.5, 0.33,
      0.5, 0.33,  0.0, 0.33,  0.0, 0.66,
      0.5, 0.33,  0.0, 0.66,  0.5, 0.66,
      0.5, 0.66,  0.0, 0.66,  0.5, 1.0,

      // Right Half
      0.5, 0.0,   0.5, 0.33,  1.0, 0.33,
      0.5, 0.33,  1.0, 0.66,  1.0, 0.33,
      0.5, 0.33,  0.5, 0.66,  1.0, 0.66,
      0.5, 0.66,  0.5, 1.0,   1.0, 0.66
    ]);
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Initialize physics state arrays
  useEffect(() => {
    const offsetProgress = offsetProgressRef.current;
    const baseRadii = baseRadiiRef.current;
    const offsets = offsetsRef.current;
    const velocities = velocitiesRef.current;
    const scales = scalesRef.current;
    const rotations = rotationsRef.current;
    const rotSpeeds = rotSpeedsRef.current;

    for (let i = 0; i < COUNT; i++) {
      // Stagger initial progress offset along the spline curve
      offsetProgress[i] = Math.random();

      // Configure tight peripheral ribbon structure: inner radius 4.5, outer radius 7.5
      const ribbonRadius = 4.5 + Math.sin(i * 0.1) * 1.5 + 1.5;
      baseRadii[i] = ribbonRadius;

      // Synchronized wave offsets using sine and cosine along the spline's local axes
      const waveAngle = offsetProgress[i] * Math.PI * 2 * 6.0 + (i / COUNT) * Math.PI * 2 * 2.0;
      offsets[i * 2] = Math.cos(waveAngle) * ribbonRadius;
      offsets[i * 2 + 1] = Math.sin(waveAngle) * ribbonRadius;

      // Velocities
      velocities[i * 2] = 0;
      velocities[i * 2 + 1] = 0;

      // Leaf scale
      scales[i] = 0.4 + Math.random() * 0.8;

      // Rotation angles
      rotations[i * 3] = Math.random() * Math.PI * 2;
      rotations[i * 3 + 1] = Math.random() * Math.PI * 2;
      rotations[i * 3 + 2] = Math.random() * Math.PI * 2;

      // Rotational speeds
      rotSpeeds[i * 3] = (Math.random() - 0.5) * 1.2;
      rotSpeeds[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
      rotSpeeds[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }

    // Initialize instanced colors
    const instancedMesh = instancedMeshRef.current;
    if (instancedMesh) {
      for (let i = 0; i < COUNT; i++) {
        const colorIndex = Math.floor(Math.random() * COLORS.length);
        instancedMesh.setColorAt(i, COLORS[colorIndex]);
      }
      instancedMesh.instanceColor!.needsUpdate = true;
      instancedMesh.frustumCulled = false;
    }
  }, []);

  // Capture mouse coordinates and calculate velocity spikes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -(e.clientY / window.innerHeight) * 2 + 1;

      mouseRef.current.set(mx, my);

      const dx = mx - prevMouseRef.current.x;
      const dy = my - prevMouseRef.current.y;
      const velocity = Math.sqrt(dx * dx + dy * dy);

      mouseVelocityRef.current = Math.max(mouseVelocityRef.current, velocity);
      prevMouseRef.current.copy(mouseRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Update loop
  useFrame((state, delta) => {
    const instancedMesh = instancedMeshRef.current;
    if (!instancedMesh) return;

    // Rate-independent clamping on delta to protect simulation stability
    const dt = Math.min(0.03, delta);
    const time = state.clock.getElapsedTime();
    const camera = state.camera;

    // Pull the EXACT same camera timeline lerped progress to lock frame-rates
    const currentProgress = progressRef.current;

    // Calculate real-time scroll velocity to dynamically scale physics speed
    const scrollVelocity = Math.abs(scrollProgress - currentProgress);
    
    // Scale leaf flow velocity and noise frequency dynamically when scrolling
    // Max multiplier of 10.0 to prevent physics instability
    const velocityMultiplier = Math.min(10.0, 1.0 + scrollVelocity * 120.0);

    // Speed up the base flow drift speed near the endscape to carry leaves off-screen dynamically
    const endDriftMultiplier = currentProgress > 0.8 ? 1.0 + (currentProgress - 0.8) * 40.0 : 1.0;
    timeAccumulatorRef.current += dt * velocityMultiplier * endDriftMultiplier;

    const offsetProgress = offsetProgressRef.current;
    const baseRadii = baseRadiiRef.current;
    const offsets = offsetsRef.current;
    const velocities = velocitiesRef.current;
    const scales = scalesRef.current;
    const rotations = rotationsRef.current;
    const rotSpeeds = rotSpeedsRef.current;

    // A. Perform Mouse Raycast Interaction
    let intersectPoint: THREE.Vector3 | null = null;
    if (mouseVelocityRef.current > 0.005) {
      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouseRef.current, camera);

      const planeNormal = new THREE.Vector3();
      camera.getWorldDirection(planeNormal);
      planeNormal.negate();

      const planePosition = new THREE.Vector3().copy(camera.position).addScaledVector(planeNormal, -8.0);
      const virtualPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePosition);

      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(virtualPlane, hit)) {
        intersectPoint = hit;
      }
    }

    mouseVelocityRef.current *= 0.95;

    // Temporary variables to avoid allocations in loop
    const tempPos = new THREE.Vector3();
    const tempScale = new THREE.Vector3();
    const tempQuat = new THREE.Quaternion();
    const tempEuler = new THREE.Euler();
    const tempMatrix = new THREE.Matrix4();
    const alignQuat = new THREE.Quaternion();
    const forwardZ = new THREE.Vector3(0, 0, 1);
    const leafN = new THREE.Vector3();
    const leafB = new THREE.Vector3();

    // Frame-rate independent friction multiplier
    const friction = Math.pow(0.94, dt * 60);

    // B. Run CPU-Side Physics & Math Updates
    for (let i = 0; i < COUNT; i++) {
      // 1. Sync leaf progress directly with the camera's timeline progress (plus a tiny rate-locked forward drift)
      const leafP = (currentProgress + offsetProgress[i] + timeAccumulatorRef.current * 0.005) % 1.0;
      
      const splinePos = NARRATIVE_SPLINE_TRACK.getPointAt(leafP);
      const tangent = NARRATIVE_SPLINE_TRACK.getTangentAt(leafP);

      // 2. Fetch precalculated Frenet Frame (Normal & Binormal) via linear fractional frame interpolation
      const virtualIndex = leafP * (FRENET_FRAMES.binormals.length - 1);
      const baseIndex = Math.floor(virtualIndex);
      const nextIndex = Math.min(baseIndex + 1, FRENET_FRAMES.binormals.length - 1);
      const alpha = virtualIndex - baseIndex;

      const n0 = FRENET_FRAMES.normals[baseIndex];
      const n1 = FRENET_FRAMES.normals[nextIndex];
      leafN.lerpVectors(n0, n1, alpha).normalize();

      const b0 = FRENET_FRAMES.binormals[baseIndex];
      const b1 = FRENET_FRAMES.binormals[nextIndex];
      leafB.lerpVectors(b0, b1, alpha).normalize();

      // 3. High-Viscosity Languid Drift (Divergence-Free Curl Noise evaluated along spline coordinates)
      const freq = 0.02;
      const curlTime = timeAccumulatorRef.current * 0.15;
      const wx = Math.sin(splinePos.y * freq + curlTime) + Math.cos(splinePos.z * freq);
      const wy = Math.sin(splinePos.z * freq + curlTime) + Math.cos(splinePos.x * freq);

      // 4. Base position calculation before swoop blending or repulsion is applied
      tempPos.copy(splinePos);
      tempPos.addScaledVector(leafN, offsets[i * 2]);
      tempPos.addScaledVector(leafB, offsets[i * 2 + 1]);

      // Apply viewport-anchored invitation swoop at start of path
      if (currentProgress < 0.02 && leafP < 0.15) {
        const swoopPos = getIntroSwoop(leafP, time, camera, i, tempPos);
        const introWeight = THREE.MathUtils.smoothstep(currentProgress, 0.02, 0.0);
        
        // Lerp absolute position toward camera-relative swoop coordinates
        tempPos.lerp(swoopPos, introWeight);
      }

      // 5. Mouse Repulsion Physics
      if (intersectPoint) {
        const dx = tempPos.x - intersectPoint.x;
        const dy = tempPos.y - intersectPoint.y;
        const dz = tempPos.z - intersectPoint.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        const maxDist = 3.2;
        if (distSq < maxDist * maxDist) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.001) {
            const force = (1.0 - dist / maxDist) * mouseVelocityRef.current * 24.0;
            const pushDirX = dx / dist;
            const pushDirY = dy / dist;
            const pushDirZ = dz / dist;

            // Project 3D push vector onto local normal and binormal vectors to update offsets
            const pushForceN = pushDirX * leafN.x + pushDirY * leafN.y + pushDirZ * leafN.z;
            const pushForceB = pushDirX * leafB.x + pushDirY * leafB.y + pushDirZ * leafB.z;

            velocities[i * 2] += pushForceN * force;
            velocities[i * 2 + 1] += pushForceB * force;
          }
        }
      }

      // Apply rate-independent velocity damping
      velocities[i * 2] *= friction;
      velocities[i * 2 + 1] *= friction;

      // 6. Spring restoring force pulling back to target ribbon position (radius 4.5 to 7.5)
      const ox = offsets[i * 2];
      const oy = offsets[i * 2 + 1];

      // Calculate target offsets on the ribbon using synchronized wave pattern
      const ribbonRadius = baseRadii[i];
      const waveAngle = leafP * Math.PI * 2 * 6.0 + (i / COUNT) * Math.PI * 2 * 2.0;
      const targetOx = Math.cos(waveAngle) * ribbonRadius;
      const targetOy = Math.sin(waveAngle) * ribbonRadius;

      const springStiffness = 3.5;
      const springForceX = (targetOx - ox) * springStiffness;
      const springForceY = (targetOy - oy) * springStiffness;

      // Update offsets with spring, noise, and velocity
      const noiseScale = 0.15 * velocityMultiplier;
      offsets[i * 2] += (springForceX + wx * noiseScale + velocities[i * 2]) * dt;
      offsets[i * 2 + 1] += (springForceY + wy * noiseScale + velocities[i * 2 + 1]) * dt;

      // Calculate exit transition values near the end of the spline path (leafP > 0.82)
      let exitWeight = 0;
      if (leafP > 0.82) {
        exitWeight = (leafP - 0.82) / 0.18; // 0.0 to 1.0
      }

      // 7. Recompute final coordinates after integrating offsets
      tempPos.copy(splinePos);

      let currentOffsetX = offsets[i * 2];
      let currentOffsetY = offsets[i * 2 + 1];

      if (exitWeight > 0) {
        // Direct radial expansion pushes them outwards away from the center
        const radialScale = 1.0 + exitWeight * 4.5;
        currentOffsetX *= radialScale;
        currentOffsetY *= radialScale;

        // Push forward along the track tangent to overshoot the camera
        tempPos.addScaledVector(tangent, exitWeight * 25.0);
      }

      tempPos.addScaledVector(leafN, currentOffsetX);
      tempPos.addScaledVector(leafB, currentOffsetY);

      if (currentProgress < 0.02 && leafP < 0.15) {
        const swoopPos = getIntroSwoop(leafP, time, camera, i, tempPos);
        const introWeight = THREE.MathUtils.smoothstep(currentProgress, 0.02, 0.0);
        tempPos.lerp(swoopPos, introWeight);
      }

      // 8. Proximity Fade-out (Prevent camera clipping near-plane)
      const dxCam = tempPos.x - camera.position.x;
      const dyCam = tempPos.y - camera.position.y;
      const dzCam = tempPos.z - camera.position.z;
      const distToCam = Math.sqrt(dxCam * dxCam + dyCam * dyCam + dzCam * dzCam);

      let proximityScale = 1.0;
      if (distToCam < 6.0) {
        proximityScale = THREE.MathUtils.smoothstep(distToCam, 4.0, 6.0);
      }

      // 9. Rotational flutter and tangent alignment
      rotations[i * 3] += rotSpeeds[i * 3] * dt;
      rotations[i * 3 + 1] += rotSpeeds[i * 3 + 1] * dt;
      rotations[i * 3 + 2] += rotSpeeds[i * 3 + 2] * dt;

      tempEuler.set(rotations[i * 3], rotations[i * 3 + 1], rotations[i * 3 + 2]);
      tempQuat.setFromEuler(tempEuler);

      alignQuat.setFromUnitVectors(forwardZ, tangent);
      tempQuat.premultiply(alignQuat);

      // 10. Scale composition
      let s = scales[i] * proximityScale;
      if (exitWeight > 0) {
        s *= (1.0 - exitWeight); // Gradually shrink to 0 as they fly away
      }
      tempScale.set(s, s, s);

      // 11. Force Identity Matrix Reconstruction (Guarantees zero dirty state accumulation / jitter)
      tempMatrix.identity();
      tempMatrix.compose(tempPos, tempQuat, tempScale);
      instancedMesh.setMatrixAt(i, tempMatrix);
    }

    // Explicitly flag matrix update for GPU rendering sync
    instancedMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[leafGeometry, null as any, COUNT]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        roughness={0.7}
        metalness={0.05}
        clearcoat={0.35}
        clearcoatRoughness={0.3}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};

export default LeafStreamEngine;
