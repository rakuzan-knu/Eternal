import { describe, it, expect } from 'vitest';
import { flipPointX, rotatePoint90 } from '../imageEditorGeometry';

describe('imageEditorGeometry', () => {
  it('flipPointX horizontally flips the point', () => {
    const point = { x: 30, y: 50 };
    const flipped = flipPointX(point, 100);
    expect(flipped).toEqual({ x: 70, y: 50 });
  });

  it('rotatePoint90 rotates the point 90 degrees clockwise within dimensions', () => {
    const point = { x: 20, y: 30 };
    const rotated = rotatePoint90(point, 100, 200);
    expect(rotated).toEqual({ x: 170, y: 20 });
  });
});
