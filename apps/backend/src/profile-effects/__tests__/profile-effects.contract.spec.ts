import { equipProfileEffectSchema } from '../../common/contracts/profile-effects';
describe('Profile effect selection contract', () => {
  it('rejects attempts to combine other decoration changes or grant ownership', () => {
    expect(
      equipProfileEffectSchema.safeParse({ profileEffectId: 'effect', nameplateId: 'plate' })
        .success,
    ).toBe(false);
    expect(
      equipProfileEffectSchema.safeParse({ profileEffectId: 'effect', userId: 'another-user' })
        .success,
    ).toBe(false);
  });
  it('accepts clearing an effect and rejects ambiguous empty selections', () => {
    expect(equipProfileEffectSchema.parse({ profileEffectId: null })).toEqual({
      profileEffectId: null,
    });
    expect(equipProfileEffectSchema.safeParse({ profileEffectId: '' }).success).toBe(false);
    expect(equipProfileEffectSchema.safeParse({}).success).toBe(false);
  });
});
