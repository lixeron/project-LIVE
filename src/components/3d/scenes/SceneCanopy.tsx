import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SceneProps {
  active: boolean;
}

export const SceneCanopy: React.FC<SceneProps> = ({ active }) => {
  const windmillBladesRef1 = useRef<THREE.Group>(null);
  const windmillBladesRef2 = useRef<THREE.Group>(null);
  const foliageGroupRef = useRef<THREE.Group>(null);

  // Rotate windmill blades in useFrame
  useFrame((state) => {
    if (!active) return;
    const time = state.clock.getElapsedTime();

    if (windmillBladesRef1.current) {
      windmillBladesRef1.current.rotation.z = time * 0.8;
    }
    if (windmillBladesRef2.current) {
      windmillBladesRef2.current.rotation.z = -time * 0.6;
    }
    if (foliageGroupRef.current) {
      foliageGroupRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
    }
  });

  if (!active) return null;

  return (
    <group>
      {/* Lighting Channels - Deep Forest Golden Hour Vibe */}
      <ambientLight intensity={0.5} color="#D7CCC8" />
      <directionalLight
        position={[-15, 10, -40]}
        intensity={1.5}
        color="#FFB74D"
        castShadow
      />
      <pointLight position={[5, 2, -45]} intensity={0.8} color="#AED581" />

      {/* Canopy Foliage/Leaf Meshes */}
      <group ref={foliageGroupRef}>
        {/* Left Foliage Array */}
        {Array.from({ length: 15 }).map((_, i) => {
          const x = -8 - Math.random() * 4;
          const y = -2 + Math.random() * 6;
          const z = -30 - i * 2.5;
          const scale = 1.5 + Math.random() * 2;
          return (
            <mesh key={`leaf-l-${i}`} position={[x, y, z]}>
              <icosahedronGeometry args={[scale, 1]} />
              <meshStandardMaterial
                color="#33691E"
                roughness={0.8}
                metalness={0.1}
                flatShading
              />
            </mesh>
          );
        })}

        {/* Right Foliage Array */}
        {Array.from({ length: 15 }).map((_, i) => {
          const x = 8 + Math.random() * 4;
          const y = -2 + Math.random() * 6;
          const z = -30 - i * 2.5;
          const scale = 1.5 + Math.random() * 2;
          return (
            <mesh key={`leaf-r-${i}`} position={[x, y, z]}>
              <icosahedronGeometry args={[scale, 1]} />
              <meshStandardMaterial
                color="#558B2F"
                roughness={0.85}
                metalness={0.05}
                flatShading
              />
            </mesh>
          );
        })}
      </group>

      {/* Windmill 1 (Left Side, near Canopy Valley Point 2) */}
      <group position={[-7, -2, -38]}>
        {/* Tower */}
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[0.3, 0.7, 6, 8]} />
          <meshStandardMaterial color="#8D6E63" roughness={0.9} flatShading />
        </mesh>
        {/* Head */}
        <mesh position={[0, 6, 0.3]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial color="#4E342E" roughness={0.7} />
        </mesh>
        {/* Blades Pivot */}
        <group ref={windmillBladesRef1} position={[0, 6, 0.8]}>
          {/* Hub */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.3, 8]} />
            <meshStandardMaterial color="#3E2723" />
          </mesh>
          {/* Three Blades */}
          {[0, 120, 240].map((angle, i) => (
            <group key={`blade1-${i}`} rotation={[0, 0, (angle * Math.PI) / 180]}>
              <mesh position={[0, 2, 0]}>
                <boxGeometry args={[0.15, 4, 0.02]} />
                <meshStandardMaterial color="#E6DFD3" roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* Windmill 2 (Right Side, winding past windmills Point 3) */}
      <group position={[6, -2.5, -53]}>
        {/* Tower */}
        <mesh position={[0, 4, 0]}>
          <cylinderGeometry args={[0.25, 0.6, 8, 8]} />
          <meshStandardMaterial color="#8D6E63" roughness={0.9} flatShading />
        </mesh>
        {/* Head */}
        <mesh position={[0, 8, 0.3]}>
          <sphereGeometry args={[0.45, 8, 8]} />
          <meshStandardMaterial color="#4E342E" roughness={0.7} />
        </mesh>
        {/* Blades Pivot */}
        <group ref={windmillBladesRef2} position={[0, 8, 0.8]}>
          {/* Hub */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.3, 8]} />
            <meshStandardMaterial color="#3E2723" />
          </mesh>
          {/* Three Blades */}
          {[0, 120, 240].map((angle, i) => (
            <group key={`blade2-${i}`} rotation={[0, 0, (angle * Math.PI) / 180]}>
              <mesh position={[0, 2.2, 0]}>
                <boxGeometry args={[0.12, 4.4, 0.02]} />
                <meshStandardMaterial color="#EAE4D9" roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};
