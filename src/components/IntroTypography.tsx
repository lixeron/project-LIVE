import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface IntroTypographyProps {
  scrollProgress: number;
  experienceLaunched: boolean;
}

export const IntroTypography: React.FC<IntroTypographyProps> = ({
  scrollProgress,
  experienceLaunched,
}) => {
  const [showLetters, setShowLetters] = useState(false);

  useEffect(() => {
    if (experienceLaunched) {
      setShowLetters(true);
    }
  }, [experienceLaunched]);

  const fadeFactor = Math.min(1, scrollProgress / 0.05);
  const introOpacity = 1 - fadeFactor;
  const introBlur = fadeFactor * 24;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        zIndex: 10,
        pointerEvents: 'none',
        display: scrollProgress >= 0.1 ? 'none' : 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5rem 2rem',
        overflow: 'hidden',
        opacity: introOpacity,
        filter: `blur(${introBlur}px)`,
        WebkitFilter: `blur(${introBlur}px)`,
        transition: 'opacity 0.15s ease-out, filter 0.15s ease-out, -webkit-filter 0.15s ease-out',
      }}
    >
      {/* Spacer to push title content to center */}
      <div style={{ height: '1px' }} />

      {/* L. I. V. E. Title Screen with Editorial Acrostic Subtitles */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '520px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            width: '100%',
            gap: '0.5rem',
            textAlign: 'center',
            marginBottom: '2.5rem',
          }}
        >
          {/* Column 1: L */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '5.8rem',
                fontWeight: 400,
                color: '#1C1C1C',
                lineHeight: 1,
                display: 'inline-block',
                opacity: showLetters ? 1 : 0,
                filter: showLetters ? 'blur(0px)' : 'blur(15px)',
                transform: showLetters ? 'translateX(0px)' : 'translateX(-30px)',
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '0.3s',
              }}
            >
              L.
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '0.94rem',
                color: '#2A2A2A',
                letterSpacing: '0.04em',
                marginTop: '0.4rem',
                opacity: showLetters ? 1 : 0,
                filter: showLetters ? 'blur(0px)' : 'blur(10px)',
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '1.5s',
              }}
            >
              Life.
            </span>
          </div>

          {/* Column 2: I */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '5.8rem',
                fontWeight: 400,
                color: '#1C1C1C',
                lineHeight: 1,
                display: 'inline-block',
                opacity: showLetters ? 1 : 0,
                filter: showLetters ? 'blur(0px)' : 'blur(15px)',
                transform: showLetters ? 'translateX(0px)' : 'translateX(-30px)',
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '0.5s',
              }}
            >
              I.
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '0.94rem',
                color: '#2A2A2A',
                letterSpacing: '0.04em',
                marginTop: '0.4rem',
                opacity: showLetters ? 1 : 0,
                filter: showLetters ? 'blur(0px)' : 'blur(10px)',
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '1.5s',
              }}
            >
              Intertwined.
            </span>
          </div>

          {/* Column 3: V */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '5.8rem',
                fontWeight: 400,
                color: '#1C1C1C',
                lineHeight: 1,
                display: 'inline-block',
                opacity: showLetters ? 1 : 0,
                filter: showLetters ? 'blur(0px)' : 'blur(15px)',
                transform: showLetters ? 'translateX(0px)' : 'translateX(-30px)',
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '0.7s',
              }}
            >
              V.
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '0.94rem',
                color: '#2A2A2A',
                letterSpacing: '0.04em',
                marginTop: '0.4rem',
                opacity: showLetters ? 1 : 0,
                filter: showLetters ? 'blur(0px)' : 'blur(10px)',
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '1.5s',
              }}
            >
              Visceral.
            </span>
          </div>

          {/* Column 4: E */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '5.8rem',
                fontWeight: 400,
                color: '#1C1C1C',
                lineHeight: 1,
                display: 'inline-block',
                opacity: showLetters ? 1 : 0,
                filter: showLetters ? 'blur(0px)' : 'blur(15px)',
                transform: showLetters ? 'translateX(0px)' : 'translateX(-30px)',
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '0.9s',
              }}
            >
              E.
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '0.94rem',
                color: '#2A2A2A',
                letterSpacing: '0.04em',
                marginTop: '0.4rem',
                opacity: showLetters ? 1 : 0,
                filter: showLetters ? 'blur(0px)' : 'blur(10px)',
                transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '1.5s',
              }}
            >
              Existence.
            </span>
          </div>
        </div>
      </div>

      {/* Scroll prompt indicator near bottom */}
      <div
        style={{
          opacity: showLetters ? 0.7 : 0,
          transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDelay: '2.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 'auto',
        }}
      >
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 300,
            fontSize: '0.85rem',
            letterSpacing: '0.12em',
            color: '#1C1C1C',
            textTransform: 'uppercase',
          }}
        >
          Scroll to venture
        </span>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 300,
            fontSize: '0.72rem',
            letterSpacing: '0.04em',
            color: '#444444',
            marginTop: '0.4rem',
            opacity: 0.85,
            textAlign: 'center',
          }}
        >
          (Scroll slowly for the best experience)
        </span>
        <motion.span
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            display: 'block',
            fontSize: '0.75rem',
            marginTop: '0.5rem',
            color: '#333333',
          }}
        >
          ↓
        </motion.span>
      </div>
    </div>
  );
};

export default IntroTypography;
