import React from 'react';

interface SceneProps {
  active: boolean;
}

export const SceneCanopy: React.FC<SceneProps> = ({ active }) => {
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
    </group>
  );
};

export default SceneCanopy;
