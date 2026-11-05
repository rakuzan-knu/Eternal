import { z } from 'zod';

const vercelSchema = z.object({
  rewrites: z.array(z.object({ source: z.string(), destination: z.string() })),
});

export function compileRouteSource(source: string): string {
  if (source === '/(.*)') return '^/.*$';
  const segments = source.split('/').slice(1);
  if (!source.startsWith('/') || segments.some((segment) => !segment)) {
    throw new Error(`Unsupported rewrite source: ${source}`);
  }
  let pattern = '^';
  for (const segment of segments) {
    if (/^:[a-zA-Z]\w*\*$/.test(segment)) pattern += '(?:/.*)?';
    else if (/^:[a-zA-Z]\w*$/.test(segment)) pattern += '/[^/]+';
    else if (/^[\w.-]+$/.test(segment)) pattern += `/${segment.replace(/\./g, '\\.')}`;
    else throw new Error(`Unsupported rewrite source: ${source}`);
  }
  return `${pattern}/?$`;
}

export function generateRouteTable(config: unknown): string {
  const routes = vercelSchema.parse(config).rewrites.map(({ source, destination }) => {
    const external = destination.startsWith('https://');
    if (!external && !destination.startsWith('/')) {
      throw new Error(`Unsupported rewrite destination: ${source}`);
    }
    return { pattern: compileRouteSource(source), external };
  });
  return `export const routeTable = ${JSON.stringify(routes, null, 2)} as const;\n`;
}
