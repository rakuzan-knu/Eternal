export interface AccessTokenPayload {
  type: 'access';
  sub: string;
  email: string;
  username: string;
}

export interface RefreshTokenPayload {
  type: 'refresh';
  sub: string;
  jti: string;
}

export interface RequestUser {
  id: string;
  email: string;
  username: string;
}
