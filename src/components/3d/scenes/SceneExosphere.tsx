import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

interface SceneProps {
  active: boolean;
}

export const SceneExosphere: React.FC<SceneProps> = ({ active }) => {
  const planetRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Rotate orbital objects in useFrame
  useFrame((state) => {
    if (!active) return;
    const time = state.clock.getElapsedTime();

    if (planetRef.current) {
      planetRef.current.rotation.y = time * 0.03;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -time * 0.01;
    }
  });

  if (!active) return null;

  return (
    <group>
      {/* Stark Space Lighting (Intense Sun direction, soft blue bounce) */}
      <ambientLight intensity={0.15} color="#0D47A1" />
      <directionalLight
        position={[25, 40, -180]}
        intensity={2.0}
        color="#FFFFFF"
      />
      <pointLight position={[-15, 30, -210]} intensity={1.0} color="#2196F3" />

      {/* R3F Drei high-fidelity Starfield */}
      <Stars
        radius={100}
        depth={50}
        count={2000}
        factor={4}
        saturation={0.5}
        fade
        speed={1}
      />

      {/* Orbit Rings / Visual guide rails for the vertical climb */}
      {Array.from({ length: 15 }).map((_, i) => {
        const t = i / 14;
        const z = -155 - t * 45; // z: -155 to -200
        const y = 18 + t * 32; // y: 18 to 50
        const scale = 2 + t * 3;

        return (
          <mesh
            key={`orbit-ring-${i}`}
            position={[0, y, z]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[scale, 0.02, 8, 32]} />
            <meshBasicMaterial
              color="#64B5F6"
              transparent
              opacity={0.15 - t * 0.05}
            />
          </mesh>
        );
      })}

      {/* Orbital Destination: Giant Planet Sphere */}
      <group position={[12, 45, -220]}>
        {/* Planet body */}
        <mesh ref={planetRef}>
          <sphereGeometry args={[8, 32, 32]} />
          <meshStandardMaterial
            color="#0D47A1"
            roughness={0.8}
            metalness={0.2}
            flatShading={false}
          />
        </mesh>

        {/* Planet Atmosphere Glow ring */}
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <sphereGeometry args={[8.15, 32, 32]} />
          <meshStandardMaterial
            color="#64B5F6"
            roughness={1.0}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Flat Saturn-like Ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 2.3, Math.PI / 8, 0]}>
          <ringGeometry args={[11, 15, 64]} />
          <meshStandardMaterial
            color="#90CAF9"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Extra floating orbital satellites/debris */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 18;
        const x = Math.cos(angle) * radius;
        const z = -190 + Math.sin(angle) * 5;
        const y = 38 + (Math.random() - 0.5) * 8;

        return (
          <mesh key={`sat-${i}`} position={[x, y, z]} rotation={[0, angle, 0]}>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial
              color="#CFD8DC"
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
};
