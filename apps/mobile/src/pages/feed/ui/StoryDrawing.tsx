import * as React from 'react';
import Svg, { Defs, G, Mask, Path, Rect } from 'react-native-svg';
import type { DrawingOverlay } from '@social-network/shared-contracts';

export function StoryDrawing({
  overlay,
  width,
  height = (width * 16) / 9,
}: {
  overlay: DrawingOverlay;
  width: number;
  height?: number;
}) {
  const masks: React.ReactNode[] = [];
  let painted: React.ReactNode[] = [];
  overlay.strokes.forEach((stroke, i) => {
    if (stroke.points.length < 2) return;
    const d = stroke.points
      .map(
        (point, index) =>
          `${index ? 'L' : 'M'} ${(point.x * width) / 100} ${(point.y * height) / 100}`,
      )
      .join(' ');
    const path = (
      <Path
        key={i}
        d={d}
        fill="none"
        stroke={stroke.tool === 'eraser' ? 'black' : stroke.color}
        strokeWidth={stroke.size}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={stroke.tool === 'marker' ? 0.5 : 1}
      />
    );
    if (stroke.tool === 'eraser') {
      const maskId = `erase-${overlay.id}-${i}`;
      masks.push(
        <Mask
          key={maskId}
          id={maskId}
          x="0"
          y="0"
          width={width}
          height={height}
          maskUnits="userSpaceOnUse"
        >
          <Rect width={width} height={height} fill="white" />
          {path}
        </Mask>,
      );
      painted = [
        <G key={maskId} mask={`url(#${maskId})`}>
          {painted}
        </G>,
      ];
    } else painted.push(path);
  });
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Defs>{masks}</Defs>
      {painted}
    </Svg>
  );
}
