import React, { useState, useRef, useId } from 'react';

interface NotFoundMilkyWayMascotProps {
  className?: string;
}

export const NotFoundMilkyWayMascot: React.FC<NotFoundMilkyWayMascotProps> = ({
  className = 'w-full max-w-[480px]',
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');

  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Smooth mouse 3D parallax
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none flex flex-col items-center justify-center pointer-events-auto ${className}`}
      style={{ perspective: '1200px' }}
    >
      {/* 60 FPS Smooth Fluid Walk Cycle Physics & Conveyor */}
      <style>{`
        @keyframes smoothCartoonStride {
          0% {
            transform: translateY(0px) rotateZ(0deg) rotateX(0deg) scale(1);
          }
          20% {
            transform: translateY(-9px) rotateZ(-1.2deg) rotateX(1deg) scale(1.008);
          }
          40% {
            transform: translateY(2px) rotateZ(0deg) rotateX(-0.5deg) scale(0.995);
          }
          60% {
            transform: translateY(-9px) rotateZ(1.2deg) rotateX(1deg) scale(1.008);
          }
          80% {
            transform: translateY(2px) rotateZ(0deg) rotateX(-0.5deg) scale(0.995);
          }
          100% {
            transform: translateY(0px) rotateZ(0deg) rotateX(0deg) scale(1);
          }
        }

        @keyframes roadConveyorMoveSmooth {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 140;
          }
        }

        @keyframes softFootShadowPulse {
          0%, 100% {
            transform: scaleX(1) scaleY(1);
            opacity: 0.6;
          }
          20%, 60% {
            transform: scaleX(0.92) scaleY(0.85);
            opacity: 0.45;
          }
          40%, 80% {
            transform: scaleX(1.08) scaleY(1.05);
            opacity: 0.75;
          }
        }

        @keyframes stardustGlideSmooth {
          0% {
            transform: translateX(110px) scale(0.6);
            opacity: 0;
          }
          25% {
            opacity: 0.95;
            transform: translateX(45px) scale(1.05);
          }
          75% {
            opacity: 0.85;
            transform: translateX(-45px) scale(0.95);
          }
          100% {
            transform: translateX(-110px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes reactorPulseGlow {
          0%, 100% {
            opacity: 0.45;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.75;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }

        .anim-60fps-walk {
          animation: smoothCartoonStride 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: 50% 90%;
          will-change: transform;
        }

        .anim-road-flow {
          animation: roadConveyorMoveSmooth 2.8s linear infinite;
        }

        .anim-shadow-step {
          animation: softFootShadowPulse 2.8s ease-in-out infinite;
          transform-origin: center center;
        }

        .anim-reactor-glow {
          animation: reactorPulseGlow 3s ease-in-out infinite;
        }

        .anim-crystal-1 {
          animation: stardustGlideSmooth 3.8s linear infinite;
        }
        .anim-crystal-2 {
          animation: stardustGlideSmooth 4.6s linear infinite 1.2s;
        }
        .anim-crystal-3 {
          animation: stardustGlideSmooth 4.2s linear infinite 2.4s;
        }
      `}</style>

      {/* 3D Wrapper with Smooth Mouse Tilt */}
      <div
        className="w-full relative flex flex-col items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Soft Ambient Nebula Glow directly behind character */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-pink-500/25 blur-[100px] pointer-events-none -z-10" />

        {/* ================= 100% SOLID CRISP 3D ROBOT MASCOT (ZERO GHOSTING) ================= */}
        <div className="relative w-72 sm:w-84 md:w-92 aspect-[1/1] flex items-center justify-center z-10 anim-60fps-walk">
          <img
            src="/images/mascot/eternal_robot_transparent.png"
            alt="3D Eternal Robot Mascot Walking smoothly on the Milky Way"
            className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(168,85,247,0.4)] select-none pointer-events-none"
            loading="eager"
          />

          {/* Glowing Reactor Accent behind Chest */}
          <div className="absolute top-[48%] left-[54%] w-16 h-16 rounded-full bg-purple-500/40 blur-md pointer-events-none anim-reactor-glow" />
        </div>

        {/* ================= FLOWING MILKY WAY ROAD DIRECTLY UNDER FEET ================= */}
        <div className="w-full -mt-20 sm:-mt-24 z-0 relative flex items-center justify-center pointer-events-none">
          <svg
            viewBox="0 0 500 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto overflow-visible drop-shadow-[0_15px_35px_rgba(168,85,247,0.4)]"
          >
            <defs>
              <linearGradient id={`stardustRoad_${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
                <stop offset="25%" stopColor="#818CF8" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#C084FC" stopOpacity="0.95" />
                <stop offset="75%" stopColor="#F472B6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
              </linearGradient>

              <linearGradient id={`roadBaseGlow_${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4338CA" stopOpacity="0" />
                <stop offset="35%" stopColor="#7E22CE" stopOpacity="0.75" />
                <stop offset="65%" stopColor="#BE185D" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#4338CA" stopOpacity="0" />
              </linearGradient>

              <filter id={`neonGlow_${id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Deep Underlayer Ambient Glow */}
            <path
              d="M 20 65 Q 150 45 250 55 T 480 50"
              stroke={`url(#roadBaseGlow_${id})`}
              strokeWidth="48"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />

            {/* Main Glowing Stardust Ribbon Road */}
            <path
              d="M 30 65 Q 150 45 250 55 T 470 50"
              stroke={`url(#stardustRoad_${id})`}
              strokeWidth="18"
              strokeLinecap="round"
              fill="none"
              filter={`url(#neonGlow_${id})`}
            />

            {/* Moving Animated Conveyor Dashes on Road */}
            <path
              d="M 40 65 Q 150 45 250 55 T 460 50"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeDasharray="14 18"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
              className="anim-road-flow"
            />
            <path
              d="M 40 60 Q 150 40 250 50 T 460 45"
              stroke="#F472B6"
              strokeWidth="2"
              strokeDasharray="8 24"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
              className="anim-road-flow"
            />

            {/* Floating Drifting Crystals on the Road */}
            <g className="anim-crystal-1">
              <polygon
                points="320,40 326,48 320,56 314,48"
                fill="#F472B6"
                filter={`url(#neonGlow_${id})`}
              />
              <circle cx="340" cy="58" r="3" fill="#38BDF8" filter={`url(#neonGlow_${id})`} />
            </g>
            <g className="anim-crystal-2">
              <polygon
                points="260,46 266,54 260,62 254,54"
                fill="#C084FC"
                filter={`url(#neonGlow_${id})`}
              />
              <circle cx="220" cy="62" r="3.5" fill="#FEF08A" filter={`url(#neonGlow_${id})`} />
            </g>
            <g className="anim-crystal-3">
              <polygon
                points="170,55 176,63 170,71 164,63"
                fill="#38BDF8"
                filter={`url(#neonGlow_${id})`}
              />
              <circle cx="140" cy="68" r="2.5" fill="#F472B6" filter={`url(#neonGlow_${id})`} />
            </g>

            {/* Soft Ground Contact Shadow Directly Beneath the Walking Feet */}
            <ellipse
              cx="255"
              cy="58"
              rx="48"
              ry="10"
              fill="#000000"
              opacity="0.7"
              className="anim-shadow-step"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
