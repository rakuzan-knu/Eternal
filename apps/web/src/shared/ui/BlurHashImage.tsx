import React, { useEffect, useRef, useState } from 'react';
import { decode } from 'blurhash';

interface BlurHashImageProps {
  blurhash?: string | null;
  src?: string | null;
  alt?: string;
  className?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const BlurHashImage: React.FC<BlurHashImageProps> = ({
  blurhash,
  src,
  alt = '',
  className = '',
  canvasWidth = 32,
  canvasHeight = 32,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;

    try {
      // Decode low-res 32x32 pixel representation for instantaneous zero-overhead rendering
      const pixels = decode(blurhash, canvasWidth, canvasHeight);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(canvasWidth, canvasHeight);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
      }
    } catch {
      // Ignore decode errors on malformed hash
    }
  }, [blurhash, canvasWidth, canvasHeight]);

  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className}`}>
      {/* Instant BlurHash placeholder canvas */}
      {blurhash && (
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ filter: 'blur(10px)', transform: 'scale(1.1)' }}
        />
      )}

      {/* Actual high-res image */}
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded || !blurhash ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
