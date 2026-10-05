import { useEffect, type ReactNode } from 'react';

export default function TextScalePreview({
  scale,
  children,
}: {
  scale: number;
  children: ReactNode;
}) {
  useEffect(() => {
    const previous = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = `${16 * scale}px`;
    return () => {
      document.documentElement.style.fontSize = previous;
    };
  }, [scale]);
  return <div className="w-full min-w-0 text-gray-100 font-sans antialiased">{children}</div>;
}
