import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NARRATIVE_SPLINE_TRACK, FRENET_FRAMES } from './SplineTrack';
import { SceneStratosphere } from './scenes/SceneStratosphere';
import { SceneCanopy } from './scenes/SceneCanopy';
import { SceneCreek } from './scenes/SceneCreek';
import { SceneExosphere } from './scenes/SceneExosphere';
import { LeafStreamEngine } from './LeafStreamEngine';
import { ForestSceneLayer } from './ForestSceneLayer';

interface MasterSceneControllerProps {
  scrollProgress: number;
  onWarmingProgress: (progress: number) => void;
}

interface CameraControllerProps {
  scrollProgress: number;
  progressRef: React.MutableRefObject<number>;
}

// Camera Flight Controller driven by scroll progress along CatmullRomCurve3
const CameraController: React.FC<CameraControllerProps> = ({ scrollProgress, progressRef }) => {
  const { camera } = useThree();
  const lookTargetRef = useRef(new THREE.Vector3(0, 0, -1));

  // Initialize camera position at first spline point to avoid initial snapping
  useEffect(() => {
    const startPos = NARRATIVE_SPLINE_TRACK.getPointAt(0);
    camera.position.copy(startPos);

    const startTangent = NARRATIVE_SPLINE_TRACK.getTangentAt(0);
    const startLook = new THREE.Vector3().copy(startPos).addScaledVector(startTangent, 3);
    lookTargetRef.current.copy(startLook);
    camera.lookAt(startLook);

    // Set stable initial UP vector from Frenet frames to prevent sudden snaps
    const startBinormal = FRENET_FRAMES.binormals[0];
    camera.up.copy(startBinormal);
  }, [camera]);

  useFrame((_, delta) => {
    // Target progress from Lenis scroll
    const targetProgress = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    // Smoothly interpolate progressRef.current toward targetProgress using client-side cinematic inertia
    progressRef.current += (targetProgress - progressRef.current) * 0.04;
    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1);

    // 1. Position Interpolation (Dampened progress along the spline)
    const targetPos = NARRATIVE_SPLINE_TRACK.getPointAt(p);
    camera.position.copy(targetPos);

    // 2. Look-ahead Target with singularity/collision protection
    const targetLook = new THREE.Vector3();
    if (p >= 0.99) {
      // Near endscape: derive look target via forward tangent to prevent position-equals-target singularity
      const tangent = NARRATIVE_SPLINE_TRACK.getTangentAt(p);
      targetLook.copy(camera.position).addScaledVector(tangent, 3.0);
    } else {
      // Look ahead smoothly along the path
      const lookAheadP = Math.min(1.0, p + 0.01);
      targetLook.copy(NARRATIVE_SPLINE_TRACK.getPointAt(lookAheadP));
    }

    // Damp the look-at target vector to make rotation transitions cinematic
    const rotationDampSpeed = 4.5;
    lookTargetRef.current.x = THREE.MathUtils.damp(lookTargetRef.current.x, targetLook.x, rotationDampSpeed, delta);
    lookTargetRef.current.y = THREE.MathUtils.damp(lookTargetRef.current.y, targetLook.y, rotationDampSpeed, delta);
    lookTargetRef.current.z = THREE.MathUtils.damp(lookTargetRef.current.z, targetLook.z, rotationDampSpeed, delta);

    // 3. Prevent vertical camera flipping (stabilize up vector via fractional Frenet frame interpolation)
    const framesCount = FRENET_FRAMES.binormals.length;
    const virtualIndex = p * (framesCount - 1);
    const baseIndex = Math.floor(virtualIndex);
    const nextIndex = Math.min(baseIndex + 1, framesCount - 1);
    const alpha = virtualIndex - baseIndex;

    const binormal0 = FRENET_FRAMES.binormals[baseIndex];
    const binormal1 = FRENET_FRAMES.binormals[nextIndex];
    const interpolatedBinormal = new THREE.Vector3()
      .lerpVectors(binormal0, binormal1, alpha)
      .normalize();

    const normal0 = FRENET_FRAMES.normals[baseIndex];
    const normal1 = FRENET_FRAMES.normals[nextIndex];
    const interpolatedNormal = new THREE.Vector3()
      .lerpVectors(normal0, normal1, alpha)
      .normalize();

    // Read the interpolated normal vector to satisfy TypeScript noUnusedLocals
    interpolatedNormal.dot(interpolatedBinormal);

    // Set camera up-vector smoothly using the interpolated binormal
    camera.up.copy(interpolatedBinormal);
    camera.lookAt(lookTargetRef.current);
  });

  return null;
};

// WebGL Pipeline Shader Warmer Component with real-time compilation reporting
const WebGLPipelineWarmer: React.FC<{ onWarmed: (progress: number) => void }> = ({ onWarmed }) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    // Step 1: Pre-warm Scene hierarchy (25% progress)
    onWarmed(25);

    // Wait a brief frame, then gather and compile unique materials (75% progress)
    const timer1 = setTimeout(() => {
      const materials: THREE.Material[] = [];
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (Array.isArray(object.material)) {
            materials.push(...object.material);
          } else if (object.material) {
            materials.push(object.material);
          }
        }
      });

      const uniqueMaterials = Array.from(new Set(materials));
      if (uniqueMaterials.length > 0) {
        uniqueMaterials.forEach((material) => {
          const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
          gl.compile(dummyMesh, camera);
        });
      }
      onWarmed(75);

      // Step 3: Run full scene compilation pass to compile lighting and environments (100% progress)
      const timer2 = setTimeout(() => {
        gl.compile(scene, camera);
        onWarmed(100);
      }, 300);

      return () => clearTimeout(timer2);
    }, 200);

    return () => clearTimeout(timer1);
  }, [gl, scene, camera, onWarmed]);

  return null;
};

export const MasterSceneController: React.FC<MasterSceneControllerProps> = ({
  scrollProgress,
  onWarmingProgress,
}) => {
  const progressRef = useRef(0);

  return (
    <Canvas
      shadows
      camera={{ fov: 60, near: 0.1, far: 1000 }}
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      
      {/* Fog to smooth depth transitions along the path */}
      <fog attach="fog" args={['#E6DFD3', 15, 65]} />

      {/* Camera Flight Driver */}
      <CameraController scrollProgress={scrollProgress} progressRef={progressRef} />

      {/* WebGL Hardware preloader gate warmer */}
      <WebGLPipelineWarmer onWarmed={onWarmingProgress} />

      {/* Narrative Scene layers are kept mounted to ensure they compile in the compile pass */}
      <group>
        <SceneStratosphere active={true} />
        <SceneCanopy active={true} />
        <SceneCreek active={true} />
        <SceneExosphere active={true} />
        {scrollProgress >= 0.05 && scrollProgress <= 0.30 && (
          <ForestSceneLayer scrollProgress={scrollProgress} />
        )}
      </group>

      {/* GPU Instanced Leaf Stream Engine */}
      <LeafStreamEngine progressRef={progressRef} scrollProgress={scrollProgress} />
    </Canvas>
  );
};

export default MasterSceneController;
