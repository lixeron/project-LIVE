import React from 'react';

interface SceneProps {
  active: boolean;
}

export const SceneCreek: React.FC<SceneProps> = ({ active }) => {
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
    </group>
  );
};

export default SceneCreek;
