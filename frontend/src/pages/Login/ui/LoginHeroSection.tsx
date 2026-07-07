import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <div className="max-w-md select-none text-left z-10">
      <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
        Connect <br /> with{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
          people
        </span>{' '}
        <br /> who matter.
      </h1>
      <p className="text-lg text-neutral-500 font-medium">
        The place where ideas live and communities thrive.
      </p>
    </div>
  );
};
