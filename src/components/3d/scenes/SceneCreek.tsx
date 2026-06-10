import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SceneProps {
  active: boolean;
}

export const SceneCreek: React.FC<SceneProps> = ({ active }) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const bubblesGroupRef = useRef<THREE.Group>(null);

  // Subtle wave translation and rising bubbles in useFrame
  useFrame((state) => {
    if (!active) return;
    const time = state.clock.getElapsedTime();

    if (waterRef.current) {
      // Simulate moving ripples
      waterRef.current.position.y = -4 + Math.sin(time * 0.8) * 0.05;
      waterRef.current.rotation.z = time * 0.01;
    }

    if (bubblesGroupRef.current) {
      bubblesGroupRef.current.children.forEach((bubble, idx) => {
        // Move bubbles up
        bubble.position.y += 0.02;
        // Float side to side
        bubble.position.x += Math.sin(time + idx) * 0.005;

        // Reset bubble position when it goes too high
        if (bubble.position.y > 0) {
          bubble.position.y = -8;
          bubble.position.x = (Math.random() - 0.5) * 6;
        }
      });
    }
  });

  if (!active) return null;

  return (
    <group>
      {/* Aquatic Deep Lighting Channels */}
      <ambientLight intensity={0.2} color="#004D40" />
      <directionalLight
        position={[0, 15, -95]}
        intensity={0.8}
        color="#80CBC4"
      />
      <spotLight
        position={[0, 10, -105]}
        angle={0.6}
        penumbra={1}
        intensity={2}
        color="#00ACC1"
        castShadow
      />
      <pointLight position={[-3, -6, -90]} intensity={0.5} color="#00838F" />

      {/* Transparent Water Surface Plane */}
      <mesh
        ref={waterRef}
        position={[0, -4, -105]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[40, 60, 16, 16]} />
        <meshStandardMaterial
          color="#006064"
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.6}
          wireframe={false}
        />
      </mesh>

      {/* Creek Bed Rocky Terrain (Canyon Walls) */}
      <group>
        {Array.from({ length: 24 }).map((_, i) => {
          const isLeft = i % 2 === 0;
          const x = isLeft ? -4.5 - Math.random() * 2 : 4.5 + Math.random() * 2;
          const y = -8 + Math.random() * 2;
          const z = -75 - i * 2.5;
          const rx = Math.random() * Math.PI;
          const ry = Math.random() * Math.PI;
          const scale = 1.2 + Math.random() * 1.8;

          return (
            <mesh
              key={`rock-${i}`}
              position={[x, y, z]}
              rotation={[rx, ry, 0]}
            >
              <dodecahedronGeometry args={[scale, 0]} />
              <meshStandardMaterial
                color={isLeft ? '#263238' : '#37474F'}
                roughness={0.9}
                metalness={0.2}
                flatShading
              />
            </mesh>
          );
        })}
      </group>

      {/* Floating Bubbles inside Submersion Creek Bed */}
      <group ref={bubblesGroupRef}>
        {Array.from({ length: 30 }).map((_, i) => {
          const x = (Math.random() - 0.5) * 6;
          const y = -8 + Math.random() * 8;
          const z = -80 - Math.random() * 45;
          const size = 0.03 + Math.random() * 0.07;

          return (
            <mesh key={`bubble-${i}`} position={[x, y, z]}>
              <sphereGeometry args={[size, 8, 8]} />
              <meshStandardMaterial
                color="#E0F7FA"
                roughness={0.0}
                metalness={0.9}
                transparent
                opacity={0.7}
              />
            </mesh>
          );
        })}
      </group>

      {/* Coastal Ocean Break Out (Visual cue portals) */}
      <mesh position={[0, -4, -130]} rotation={[0, 0, 0]}>
        <torusGeometry args={[3, 0.05, 8, 24]} />
        <meshBasicMaterial color="#80DEEA" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};
