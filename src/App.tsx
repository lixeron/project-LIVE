import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { HardwarePreloader } from './components/HardwarePreloader';

export const App: React.FC = () => {
  const [assetProgress, setAssetProgress] = useState(0);
  const [experienceLaunched, setExperienceLaunched] = useState(false);

  // Asset Loader Pipeline and Fallback Buffer Ticker
  useEffect(() => {
    THREE.DefaultLoadingManager.onStart = () => {};
    THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
      setAssetProgress((loaded / total) * 100);
    };
    THREE.DefaultLoadingManager.onLoad = () => {
      setAssetProgress(100);
    };

    // Simulated asset streaming for Phase 1 procedural buffering
    const interval = setInterval(() => {
      setAssetProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 10 + 3;
      });
    }, 110);

    return () => clearInterval(interval);
  }, []);

  return (
    <HardwarePreloader
      progress={assetProgress}
      hardwareWarmed={true}
      scrollProgress={0}
      experienceLaunched={experienceLaunched}
      onLaunch={() => setExperienceLaunched(true)}
    />
  );
};

export default App;
