import React from 'react';

interface SceneProps {
  active: boolean;
}

export const SceneStratosphere: React.FC<SceneProps> = ({ active }) => {
  if (!active) return null;

  return (
    <group>
      {/* Foundational Environment Lighting Channels */}
      <ambientLight intensity={0.45} color="#E0F2F1" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.3}
        color="#FFF9C4"
        castShadow
      />
      <pointLight position={[-10, 5, -5]} intensity={0.5} color="#B2DFDB" />
    </group>
  );
};
export default SceneStratosphere;
