import React from 'react';

interface SceneProps {
  active: boolean;
}

export const SceneExosphere: React.FC<SceneProps> = ({ active }) => {
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
    </group>
  );
};

export default SceneExosphere;
