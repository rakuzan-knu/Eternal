import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  containerClassName?: string;
  align?: 'left' | 'center';
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = '',
  containerClassName = '',
  align = 'left',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDist, setOverflowDist] = useState<number>(0);

  useEffect(() => {
    const calculateOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        const diff = textWidth - containerWidth;
        if (diff > 3) {
          setOverflowDist(diff + 8);
        } else {
          setOverflowDist(0);
        }
      }
    };

    calculateOverflow();

    const resizeObserver = new ResizeObserver(() => {
      calculateOverflow();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', calculateOverflow);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateOverflow);
    };
  }, [text]);

  const isOverflowing = overflowDist > 0;
  const duration = Math.max(5, Math.min(12, 4 + overflowDist / 12));

  const textAlign = isOverflowing ? 'left' : align;

  return (
    <div
      ref={containerRef}
      title={text}
      className={`relative overflow-hidden whitespace-nowrap min-w-0 ${containerClassName}`}
      style={{ textAlign }}
    >
      <span
        ref={textRef}
        className={`inline-block ${className}`}
        style={
          isOverflowing
            ? ({
                '--marquee-dist': `${overflowDist}px`,
                animation: `marquee-ticker ${duration}s ease-in-out infinite alternate`,
                willChange: 'transform',
                textAlign: 'left',
              } as React.CSSProperties)
            : {
                textAlign,
              }
        }
      >
        {text}
      </span>
    </div>
  );
};
