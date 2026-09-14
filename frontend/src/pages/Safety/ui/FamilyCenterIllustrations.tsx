import React from 'react';
import { Shield, BookOpen, Sliders, MessageSquare, Volume2, Sparkles } from 'lucide-react';

export const HourglassIllustration: React.FC<{ className?: string }> = ({
  className = 'w-64 h-64 sm:w-72 sm:h-72',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-purple-600/35 rounded-full blur-3xl animate-pulse" />
      <div className="absolute w-36 h-36 bg-pink-500/25 rounded-full blur-2xl -bottom-2" />

      {/* Photorealistic 3D Glass Hourglass with true transparent alpha */}
      <div className="relative w-full h-full flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform duration-700">
        <img
          src="/images/safety/hourglass-3d.png"
          alt="3D Crystal Hourglass"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] drop-shadow-[0_0_30px_rgba(168,85,247,0.35)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const CrestShieldIllustration: React.FC<{ className?: string }> = ({
  className = 'w-64 h-64 sm:w-72 sm:h-72',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-indigo-600/35 rounded-full blur-3xl animate-pulse" />
      <div className="absolute w-40 h-40 bg-pink-500/30 rounded-full blur-2xl -right-2 top-2" />

      {/* Photorealistic 3D Eternal Safety Shield with true transparent alpha */}
      <div className="relative w-full h-full flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-700">
        <img
          src="/images/safety/shield-3d.png"
          alt="3D Eternal Safety Shield"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] drop-shadow-[0_0_30px_rgba(236,72,153,0.35)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const ParentsIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Soft Ambient Purple Glow underneath */}
      <div className="absolute w-72 h-72 bg-purple-600/20 rounded-full blur-3xl -bottom-2 pointer-events-none" />

      {/* Photorealistic 3D Model Cluster */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <img
          src="/images/safety/parents-3d.png"
          alt="For Parents and Guardians 3D Model"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(139,92,246,0.3)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const MegaphoneIllustration: React.FC<{ className?: string }> = ({
  className = 'w-20 h-20',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/40 shadow-xl flex items-center justify-center transform -rotate-12">
        <Volume2 size={32} className="text-white" />
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-400 animate-ping" />
      </div>
    </div>
  );
};

export const EyeballsIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => {
  return (
    <div className={`relative flex items-center justify-center gap-2 select-none ${className}`}>
      {/* Left Eye */}
      <div className="w-10 h-10 rounded-full bg-white shadow-2xl border-2 border-purple-200 flex items-center justify-center relative overflow-hidden transform rotate-6">
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-700 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white -mt-1 -ml-1" />
        </div>
      </div>

      {/* Right Eye */}
      <div className="w-10 h-10 rounded-full bg-white shadow-2xl border-2 border-purple-200 flex items-center justify-center relative overflow-hidden transform -rotate-6">
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-700 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white -mt-1 -ml-1" />
        </div>
      </div>
    </div>
  );
};

export const TeensIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[460px] aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Soft Ambient Purple Glow underneath */}
      <div className="absolute w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl -bottom-2 pointer-events-none" />
      <div className="absolute w-40 h-40 bg-pink-500/15 rounded-full blur-2xl right-4 top-2 pointer-events-none" />

      {/* Photorealistic 3D Teens Chat Bubbles Model */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <img
          src="/images/safety/teens-3d.png"
          alt="For Teens 3D Chat Bubbles Model"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(168,85,247,0.3)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const GuidelinesBookIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36 sm:w-44 sm:h-44',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute w-20 h-20 bg-pink-500/25 rounded-full blur-xl bottom-2 right-2 pointer-events-none" />

      {/* 3D Model Asset */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-105">
        <img
          src="/images/safety/guidelines-3d.png"
          alt="3D Community Guidelines Book"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] drop-shadow-[0_0_25px_rgba(168,85,247,0.3)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const SafetyControlsIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36 sm:w-44 sm:h-44',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute w-24 h-24 bg-cyan-500/20 rounded-full blur-xl top-2 left-2 pointer-events-none" />

      {/* 3D Model Asset */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-105">
        <img
          src="/images/safety/safety-controls-3d.png"
          alt="3D Safety Controls Console"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] drop-shadow-[0_0_25px_rgba(6,182,212,0.3)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const ExtinguisherIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36 sm:w-48 sm:h-48 lg:w-56 lg:h-56',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-36 h-36 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute w-24 h-24 bg-pink-500/20 rounded-full blur-2xl bottom-2 right-2 pointer-events-none" />

      {/* 3D Extinguisher Model with floating angle */}
      <div className="relative w-full h-full flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform duration-700">
        <img
          src="/images/safety/extinguisher-3d.png"
          alt="3D Safety Extinguisher"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] drop-shadow-[0_0_25px_rgba(236,72,153,0.3)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const GearIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36 sm:w-48 sm:h-48 lg:w-56 lg:h-56',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-36 h-36 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute w-24 h-24 bg-pink-500/20 rounded-full blur-2xl top-2 right-2 pointer-events-none" />

      {/* 3D Gear Model with floating tilt */}
      <div className="relative w-full h-full flex items-center justify-center transform rotate-12 hover:rotate-45 transition-transform duration-700">
        <img
          src="/images/safety/gear-3d.png"
          alt="3D Mechanical Gear"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] drop-shadow-[0_0_25px_rgba(168,85,247,0.3)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};
