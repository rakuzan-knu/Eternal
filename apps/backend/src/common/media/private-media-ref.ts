const PREFIX = 'private-media://';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function privateMediaId(url: string): string | null {
  const id = url.startsWith(PREFIX) ? url.slice(PREFIX.length) : '';
  return UUID.test(id) ? id : null;
}

export const privateMediaRef = (id: string) => `${PREFIX}${id}`;
