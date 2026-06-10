import React, { useEffect, useState } from 'react';

interface HardwarePreloaderProps {
  progress: number; // Linked directly to progress calculation in App.tsx
  scrollProgress: number; // Mapped to scroll offset (0.0 to 1.0)
  experienceLaunched: boolean; // True when system ready transitions automatically
  onLaunch: () => void; // Callback to notify App that preloading is complete
}

export const HardwarePreloader: React.FC<HardwarePreloaderProps> = ({
  progress,
  scrollProgress,
  experienceLaunched,
  onLaunch,
}) => {
  const isSystemReady = progress >= 100;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-trigger launch when system transitions to ready
  useEffect(() => {
    if (isSystemReady && !experienceLaunched) {
      onLaunch();
    }
  }, [isSystemReady, experienceLaunched, onLaunch]);

  // Fade out preloader loader content immediately when launch starts
  const loaderContentOpacity = experienceLaunched ? 0 : 1;

  return (
    <div
      className={`preloader-curtain ${experienceLaunched ? 'launched' : ''}`}
      style={{
        display: scrollProgress >= 0.1 ? 'none' : 'flex',
        backgroundColor: '#E6DFD3',
        zIndex: 9999,
      }}
    >
      {/* Center Minimalist Typography & Progress Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          margin: 'auto',
          width: '100%',
          maxWidth: '420px',
          opacity: loaderContentOpacity,
          transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.82rem',
            fontWeight: 400,
            letterSpacing: '0.35em',
            color: '#1C1C1C',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: '1.8rem',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          ASTOYLO // DEVELOPED BY LIXERON
        </div>

        {/* Minimalist Horizontal Rail Loading Bar */}
        <div
          style={{
            width: '100%',
            maxWidth: '280px',
            height: '1px',
            backgroundColor: 'rgba(26, 26, 26, 0.08)',
            position: 'relative',
            transform: mounted ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'center',
            transition: 'transform 1.0s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '0.3s',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#1C1C1C',
              transition: 'width 0.25s ease-out',
            }}
          />
        </div>

        {/* Percentage Text */}
        <div
          style={{
            marginTop: '1.2rem',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.75rem',
            fontWeight: 300,
            letterSpacing: '0.12em',
            color: '#1C1C1C',
            opacity: mounted ? 0.65 : 0,
            transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '0.5s',
            textAlign: 'center',
          }}
        >
          {Math.floor(progress)}%
        </div>
      </div>
    </div>
  );
};

export default HardwarePreloader;
