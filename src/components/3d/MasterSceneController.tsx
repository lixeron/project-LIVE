import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NARRATIVE_SPLINE_TRACK, FRENET_FRAMES, FRENET_SEGMENTS } from './SplineTrack';
import { SceneStratosphere } from './scenes/SceneStratosphere';
import { SceneCanopy } from './scenes/SceneCanopy';
import { SceneCreek } from './scenes/SceneCreek';
import { SceneExosphere } from './scenes/SceneExosphere';

interface MasterSceneControllerProps {
  scrollProgress: number;
  onWarmed: () => void;
}

// Camera Flight Controller driven by scroll progress along CatmullRomCurve3
const CameraController: React.FC<{ scrollProgress: number }> = ({ scrollProgress }) => {
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
    // Constrain scrollProgress between 0 and 1
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    // 1. Position Interpolation (Direct binding to scroll)
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

    // 3. Prevent vertical camera flipping (stabilize up vector via Frenet frames interpolation)
    const indexFloat = p * FRENET_SEGMENTS;
    const index0 = Math.floor(indexFloat);
    const index1 = Math.min(FRENET_SEGMENTS, index0 + 1);
    const weight = indexFloat - index0;

    const binormal0 = FRENET_FRAMES.binormals[index0];
    const binormal1 = FRENET_FRAMES.binormals[index1];

    const interpolatedBinormal = new THREE.Vector3()
      .lerpVectors(binormal0, binormal1, weight)
      .normalize();

    camera.up.copy(interpolatedBinormal);
    camera.lookAt(lookTargetRef.current);
  });

  return null;
};

// WebGL Pipeline Shader Warmer Component
const WebGLPipelineWarmer: React.FC<{ onWarmed: () => void }> = ({ onWarmed }) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    // Warm up GPU shaders by triggering early compilation of the scene graph
    gl.compile(scene, camera);

    // Verify warming completion and signal back
    const timer = setTimeout(() => {
      onWarmed();
    }, 850); // Generous compilation delay for hardware safety

    return () => clearTimeout(timer);
  }, [gl, scene, camera, onWarmed]);

  return null;
};

export const MasterSceneController: React.FC<MasterSceneControllerProps> = ({
  scrollProgress,
  onWarmed,
}) => {
  return (
    <Canvas
      shadows
      camera={{ fov: 60, near: 0.1, far: 1000 }}
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#E6DFD3']} />
      
      {/* Fog to smooth depth transitions along the path */}
      <fog attach="fog" args={['#E6DFD3', 15, 65]} />

      {/* Camera Flight Driver */}
      <CameraController scrollProgress={scrollProgress} />

      {/* WebGL Hardware preloader gate warmer */}
      <WebGLPipelineWarmer onWarmed={onWarmed} />

      {/* Narrative Scene layers are kept mounted to ensure they compile in the compile pass */}
      <group>
        <SceneStratosphere active={true} />
        <SceneCanopy active={true} />
        <SceneCreek active={true} />
        <SceneExosphere active={true} />
      </group>
    </Canvas>
  );
};
export default MasterSceneController;
