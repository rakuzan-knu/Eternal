import { describe, expect, it } from 'vitest';
import config from '../../../vercel.json';
import { compileRouteSource, generateRouteTable } from './route-table';
import { routeTable } from '../src/main/generated/routeTable';

describe('Vercel route generation', () => {
  it('keeps every rewrite in order and the generated module current', () => {
    const generated = generateRouteTable(config);
    expect(generated).toBe(
      `export const routeTable = ${JSON.stringify(routeTable, null, 2)} as const;\n`,
    );
    expect(routeTable).toHaveLength(config.rewrites.length);
  });

  it('matches both base paths and descendants without prefix collisions', () => {
    const matcher = new RegExp(compileRouteSource('/v1/:path*'));
    expect(matcher.test('/v1')).toBe(true);
    expect(matcher.test('/v1/')).toBe(true);
    expect(matcher.test('/v1/auth/me')).toBe(true);
    expect(matcher.test('/v10/auth')).toBe(false);
  });

  it('fails closed on new unsupported route syntax', () => {
    expect(() => compileRouteSource('/v1/:path(.*)')).toThrow('Unsupported rewrite');
    expect(() =>
      generateRouteTable({ rewrites: [{ source: '/v1', destination: 'http://api.test' }] }),
    ).toThrow('Unsupported rewrite');
  });
});
