import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { HardwarePreloader } from './components/HardwarePreloader';
import { MasterSceneController } from './components/3d/MasterSceneController';
import Lenis from 'lenis';

export const App: React.FC = () => {
  const [assetProgress, setAssetProgress] = useState(0);
  const [experienceLaunched, setExperienceLaunched] = useState(false);
  const [hardwareWarmed, setHardwareWarmed] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const lenisRef = useRef<Lenis | null>(null);

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

  // Initialize Lenis smooth scrolling and clean up on unmount
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // Reset scroll positions immediately on mount
    window.scrollTo(0, 0);
    lenis.scrollTo(0, { immediate: true });

    // Lock scroll on initial load
    lenis.stop();

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const handleScroll = (e: any) => {
      // Set normalized scroll progress (0.0 to 1.0)
      setScrollProgress(e.progress);
    };

    lenis.on('scroll', handleScroll);

    return () => {
      lenis.off('scroll', handleScroll);
      lenis.destroy();
      cancelAnimationFrame(rafId);
      lenisRef.current = null;
    };
  }, []);

  // Control Lenis scrolling state based on experience launch lifecycle
  useEffect(() => {
    if (lenisRef.current) {
      if (experienceLaunched) {
        lenisRef.current.start();
      } else {
        lenisRef.current.stop();
      }
    }
  }, [experienceLaunched]);

  return (
    <>
      {/* Global 3D Canvas Viewport in the Background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1,
          pointerEvents: experienceLaunched ? 'auto' : 'none',
        }}
      >
        <MasterSceneController
          scrollProgress={scrollProgress}
          onWarmed={() => setHardwareWarmed(true)}
        />
      </div>

      {/* Cinematic Loading Gate and Fluid Simulation Overlay */}
      <HardwarePreloader
        progress={assetProgress}
        hardwareWarmed={hardwareWarmed}
        scrollProgress={scrollProgress}
        experienceLaunched={experienceLaunched}
        onLaunch={() => setExperienceLaunched(true)}
      />

      {/* Invisible Scroll Track Spacer */}
      <div
        style={{
          height: '800vh',
          width: '100%',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

export default App;
