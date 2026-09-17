import React, { useState, useEffect, useRef } from 'react';
import { decodeBlurHash } from '@/shared/lib/blurhash';

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  blurhash?: string | null;
  aspectRatio?: number;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  blurhash,
  aspectRatio,
  alt = '',
  className = '',
  imgClassName = '',
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;
    const width = 32;
    const height = 32;
    const pixels = decodeBlurHash(blurhash, width, height);
    if (!pixels) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
  }, [blurhash]);

  const containerStyle: React.CSSProperties = {
    ...(aspectRatio ? { aspectRatio: `${aspectRatio}` } : {}),
    ...style,
  };

  return (
    <div className={`relative overflow-hidden bg-[#121214] ${className}`} style={containerStyle}>
      {/* 1. Instant 0ms BlurHash Canvas Placeholder */}
      {blurhash && !isLoaded && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className="absolute inset-0 w-full h-full object-cover scale-110 filter blur-md transition-opacity duration-300 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* 2. Full High-Res Image with Smooth Fade-In */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-all duration-400 ease-out ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
        } ${imgClassName}`}
        {...props}
      />
    </div>
  );
};
