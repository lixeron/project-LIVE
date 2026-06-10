import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import Lenis from 'lenis';
import { HardwarePreloader } from './components/HardwarePreloader';
import { MasterSceneController } from './components/3d/MasterSceneController';

export const App: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [assetProgress, setAssetProgress] = useState(0);
  const [hardwareWarmed, setHardwareWarmed] = useState(false);
  const [experienceLaunched, setExperienceLaunched] = useState(false);

  // 1. Initialize Lenis Inertial Scroll Controller once experience is unlocked
  useEffect(() => {
    if (!experienceLaunched) return;

    const lenis = new Lenis({
      duration: 1.6,
      lerp: 0.055, // Extra high inertia for cinematic deceleration
      infinite: false,
      syncTouch: true,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Track normalized scroll progress (0.0 to 1.0)
    lenis.on('scroll', (e) => {
      if (typeof e.progress === 'number') {
        setScrollProgress(e.progress);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [experienceLaunched]);

  // 2. Asset Loader Pipeline and Fallback Buffer Ticker
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

  // Compute active documentary envelope name driven by spline progress
  const getCurrentLayerName = () => {
    if (scrollProgress < 0.25) return 'I. STRATOSPHERE';
    if (scrollProgress < 0.55) return 'II. CANOPY VALLEY';
    if (scrollProgress < 0.8) return 'III. CREEK SUBMERSION';
    return 'IV. EXOSPHERE ORBIT';
  };

  return (
    <>
      {/* A. Fixed Canvas Render Wrapper - Rendered immediately in the background */}
      <div className="canvas-container">
        <MasterSceneController
          scrollProgress={scrollProgress}
          onWarmed={() => setHardwareWarmed(true)}
        />
      </div>

      {/* B. Hardware-Gated Preloader Overlay (Editorial Layer) */}
      <HardwarePreloader
        progress={assetProgress}
        hardwareWarmed={hardwareWarmed}
        scrollProgress={scrollProgress}
        experienceLaunched={experienceLaunched}
        onLaunch={() => setExperienceLaunched(true)}
      />

      {/* C. Scrollable Page Envelope */}
      {experienceLaunched && (
        <div className="scroll-container">
          {/* HUD UI overlay (Micro-branding and tracking indicators) */}
          <div className="ui-container">
            {/* Top Bar: Title & Spline track descriptors */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'flex-start',
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.62rem',
                    letterSpacing: '0.22em',
                    color: '#8A826E',
                    textTransform: 'uppercase',
                  }}
                >
                  Documentary Spline Track
                </div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '1.15rem',
                    letterSpacing: '0.04em',
                    color: '#1A1A1A',
                    marginTop: '0.15rem',
                  }}
                >
                  ASTOYLO
                </div>
              </div>

              {/* Secondary Branding metadata */}
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.62rem',
                  letterSpacing: '0.12em',
                  color: '#1A1A1A',
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  opacity: 0.7,
                }}
              >
                ASTOYLO // Developed by Lixeron
              </div>
            </div>

            {/* Bottom HUD: Layer label and progress values */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                width: '100%',
                pointerEvents: 'none',
              }}
            >
              {/* Active Layer Panel */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.58rem',
                    color: '#8A826E',
                    letterSpacing: '0.12em',
                    marginBottom: '0.15rem',
                  }}
                >
                  ACTIVE ENVELOPE
                </span>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '0.88rem',
                    letterSpacing: '0.04em',
                    color: '#1A1A1A',
                  }}
                >
                  {getCurrentLayerName()}
                </span>
              </div>

              {/* Progress Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div
                  style={{
                    width: '110px',
                    height: '2px',
                    backgroundColor: 'rgba(26, 26, 26, 0.1)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${scrollProgress * 100}%`,
                      backgroundColor: '#1A1A1A',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#1A1A1A',
                    minWidth: '35px',
                  }}
                >
                  {Math.round(scrollProgress * 100).toString().padStart(3, '0')}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default App;
