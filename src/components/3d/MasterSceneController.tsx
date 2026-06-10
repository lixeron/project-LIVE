import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NARRATIVE_SPLINE_TRACK } from './SplineTrack';
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
  }, [camera]);

  useFrame((_, delta) => {
    // Constrain scrollProgress between 0 and 1
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    // 1. Position Interpolation
    const targetPos = NARRATIVE_SPLINE_TRACK.getPointAt(p);
    
    // Frame-independent exponential dampening for smooth flight
    const dampSpeed = 3.2;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.x, dampSpeed, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.y, dampSpeed, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.z, dampSpeed, delta);

    // 2. Sweeping Banking/Rotation Mechanics
    const tangent = NARRATIVE_SPLINE_TRACK.getTangentAt(p);
    
    // Target look-at coordinate is camera position + tangent vector (scaled for distance offset)
    const targetLook = new THREE.Vector3()
      .copy(camera.position)
      .addScaledVector(tangent, 3.0);

    // Damp the look-at target vector to make rotation transitions cinematic
    const rotationDampSpeed = 4.5;
    lookTargetRef.current.x = THREE.MathUtils.damp(lookTargetRef.current.x, targetLook.x, rotationDampSpeed, delta);
    lookTargetRef.current.y = THREE.MathUtils.damp(lookTargetRef.current.y, targetLook.y, rotationDampSpeed, delta);
    lookTargetRef.current.z = THREE.MathUtils.damp(lookTargetRef.current.z, targetLook.z, rotationDampSpeed, delta);

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
