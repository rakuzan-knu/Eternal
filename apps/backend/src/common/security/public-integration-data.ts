/** Strip credentials and private profile state in every nested integration representation. */
export function publicIntegrationData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(publicIntegrationData) as T;
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (
      key.startsWith('_') ||
      /token|secret|password|credential|authorization|cookie|apikey|privatekey/.test(normalized)
    )
      continue;
    result[key] = publicIntegrationData(child);
  }
  return result as T;
}

/** Public settings updates preserve server credentials; unlinking uses the dedicated provider route. */
export function mergeIntegrationSettings(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merge = (
    stored: Record<string, unknown>,
    settings: Record<string, unknown>,
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = { ...stored };
    for (const [key, value] of Object.entries(settings)) {
      const previous = stored[key];
      result[key] =
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        previous &&
        typeof previous === 'object' &&
        !Array.isArray(previous)
          ? merge(previous as Record<string, unknown>, value as Record<string, unknown>)
          : value;
    }
    return result;
  };
  return merge(existing, publicIntegrationData(incoming));
}
