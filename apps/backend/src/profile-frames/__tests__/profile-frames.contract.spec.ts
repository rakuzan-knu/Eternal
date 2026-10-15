import { equipProfileFrameSchema, profileFrameSchema } from '../../common/contracts/profile-frames';
describe('Frame selection boundary', () => {
  it('preserves optional racing metadata without requiring it on earlier frames', () => {
    const frame = {
      id: 'formula',
      slug: 'formula',
      name: 'Formula',
      description: 'Perimeter racer',
      family: 'racing',
      variant: 'racing-formula',
      color: '#299dff',
      accent: '#d9f5ff',
      crownUrl: '/crown.svg',
      crownPreviewUrl: '/crown.webp',
      cornerUrl: '/corner.svg',
      railUrl: '/rail.svg',
      footerUrl: '/footer.svg',
      animated: true,
      fps: 60,
      durationMs: 8000,
      rarity: 'epic',
      priceCents: 199,
      isAvailable: false,
      vehicleAtlasUrl: '/atlas.webp',
      vehiclePreviewUrl: '/car.webp',
    };
    expect(profileFrameSchema.parse(frame)).toEqual(frame);
    const { vehicleAtlasUrl: _atlas, vehiclePreviewUrl: _poster, ...oldFrame } = frame;
    expect(profileFrameSchema.safeParse({ ...oldFrame, family: 'dragon' }).success).toBe(true);
  });
  it('accepts only a nonempty catalog ID or explicit removal', () => {
    expect(equipProfileFrameSchema.parse({ profileFrameId: null })).toEqual({
      profileFrameId: null,
    });
    expect(equipProfileFrameSchema.parse({ profileFrameId: 'frame' })).toEqual({
      profileFrameId: 'frame',
    });
    for (const input of [
      {},
      { profileFrameId: '' },
      { profileFrameId: 1 },
      { profileFrameId: 'frame', userId: 'another-user' },
      { profileFrameId: 'frame', activeProfileEffectId: null },
    ])
      expect(equipProfileFrameSchema.safeParse(input).success).toBe(false);
  });
});
