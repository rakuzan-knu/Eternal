export const routeTable = [
  {
    "pattern": "^/integrations/twitch/callback/?$",
    "external": false
  },
  {
    "pattern": "^/integrations/github/callback(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/integrations/github/callback(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/integrations/github/callback(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/integrations/github/callback(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/conversations(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/conversations(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/conversations(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/calls(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/calls(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/calls(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/crypto/prekeys(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/crypto/prekeys(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/crypto/prekeys(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/e2ee(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/e2ee(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/e2ee(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/messenger(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/messenger(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/messenger(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/soundboard(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/soundboard(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/soundboard(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/watch-together(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/watch-together(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/watch-together(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/reels(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/reels(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/reels(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/integrations(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/integrations(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/integrations(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/spotify(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/spotify(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/spotify(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1/auth/spotify(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/auth/spotify(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1/auth/spotify(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/integrations(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/spotify(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/auth/spotify(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api/v1(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/api(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/v1(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/auth(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/uploads(?:/.*)?/?$",
    "external": true
  },
  {
    "pattern": "^/health/?$",
    "external": true
  },
  {
    "pattern": "^/.*$",
    "external": false
  }
] as const;
