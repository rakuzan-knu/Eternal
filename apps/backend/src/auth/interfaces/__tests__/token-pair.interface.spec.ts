import type { TokenPair } from '../token-pair.interface';

describe('token-pair.interface', () => {
  it('should correctly type TokenPair structure', () => {
    const pair: TokenPair = {
      accessToken: 'access_jwt_token_sample',
      refreshToken: 'refresh_jwt_token_sample',
    };

    expect(pair.accessToken).toBe('access_jwt_token_sample');
    expect(pair.refreshToken).toBe('refresh_jwt_token_sample');
  });
});
