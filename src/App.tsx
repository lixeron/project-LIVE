import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { HardwarePreloader } from './components/HardwarePreloader';
import { MasterSceneController } from './components/3d/MasterSceneController';
import { FluidBackground } from './components/FluidBackground';
import { IntroTypography } from './components/IntroTypography';
import Lenis from 'lenis';

export const App: React.FC = () => {
  const [assetProgress, setAssetProgress] = useState(100); // Defaults to 100 since no initial files
  const [compileProgress, setCompileProgress] = useState(0);
  const [hasAssets, setHasAssets] = useState(false);
  const [experienceLaunched, setExperienceLaunched] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const lenisRef = useRef<Lenis | null>(null);

  // Asset Loader Pipeline (without simulated tickers)
  useEffect(() => {
    THREE.DefaultLoadingManager.onStart = () => {
      setHasAssets(true);
      setAssetProgress(0);
    };
    THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
      setAssetProgress((loaded / total) * 100);
    };
    THREE.DefaultLoadingManager.onLoad = () => {
      setAssetProgress(100);
    };
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
        // Wait for the curtain to pass the halfway mark (0.7s) to start Lenis
        const timer = setTimeout(() => {
          lenisRef.current?.start();
        }, 700);
        return () => clearTimeout(timer);
      } else {
        lenisRef.current.stop();
      }
    }
  }, [experienceLaunched]);

  // Combined progress: if assets are loading, average both; else, use compileProgress
  const progress = hasAssets ? Math.floor((assetProgress + compileProgress) / 2) : compileProgress;

  return (
    <>
      {/* Permanent WebGL Watercolor fluid dynamics simulation canvas (zIndex: 1) */}
      <FluidBackground scrollProgress={scrollProgress} />

      {/* Global 3D Canvas Viewport (zIndex: 2) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 2,
          pointerEvents: experienceLaunched ? 'auto' : 'none',
        }}
      >
        <MasterSceneController
          scrollProgress={scrollProgress}
          onWarmingProgress={(p) => setCompileProgress(p)}
        />
      </div>

      {/* Intro Typography Stage (Layer 2 - zIndex: 10, pointer-events: none) */}
      <IntroTypography
        scrollProgress={scrollProgress}
        experienceLaunched={experienceLaunched}
      />

      {/* Hardware Preloader Curtain (Layer 1 - zIndex: 9999) */}
      <HardwarePreloader
        progress={progress}
        scrollProgress={scrollProgress}
        experienceLaunched={experienceLaunched}
        onLaunch={() => setExperienceLaunched(true)}
      />

      {/* Invisible Scroll Track Spacer */}
      <div
        style={{
          height: '3500vh',
          width: '100%',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

export default App;
