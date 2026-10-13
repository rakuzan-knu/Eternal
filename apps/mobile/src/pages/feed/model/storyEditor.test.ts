import { expect, it } from 'vitest';
import { CreateStoryDtoSchema } from '@social-network/shared-contracts';
import { backgroundPreset, makeOverlay, snapAngle, snapCoordinate } from './storyEditor';
import { base64Bytes, storyPalette } from './storyPalette';

it('uses web backgrounds and snaps gestures without leaving the canvas', () => {
  for (let index = 0; index < 8; index++)
    expect(
      CreateStoryDtoSchema.safeParse({ backgroundColor: backgroundPreset(index) }).success,
    ).toBe(true);
  expect(snapCoordinate(49)).toBe(50);
  expect(snapCoordinate(130)).toBe(100);
  expect(snapCoordinate(-5)).toBe(0);
  expect(snapAngle(47)).toBe(45);
  expect(snapAngle(400)).toBe(40);
  expect(makeOverlay({ type: 'text', text: 'Hello' })).toMatchObject({
    xPercent: 50,
    yPercent: 50,
    scale: 1,
    rotation: 0,
  });
});
it('extracts legible colours from top and bottom photo regions and decodes JPEG bytes portably', () => {
  expect(storyPalette(new Uint8Array([200, 100, 40, 255, 50, 200, 100, 255]), 1, 2)).toBe(
    'linear-gradient(180deg, rgb(150, 75, 30) 0%, rgb(20, 80, 40) 100%)',
  );
  expect(storyPalette(new Uint8Array(), 0, 0)).toBeNull();
  expect([...base64Bytes('/9j/')]).toEqual([255, 216, 255]);
  expect([...base64Bytes('aGVsbG8=')]).toEqual([104, 101, 108, 108, 111]);
});
