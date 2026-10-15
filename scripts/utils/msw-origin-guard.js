export function preserveMswOriginGuard(source) {
  if (source.includes('if (event.origin && event.origin !== self.location.origin)')) {
    return source;
  }
  const handler = "addEventListener('message', async function (event) {";
  if (!source.includes(handler)) {
    throw new Error('Unexpected MSW message handler: cannot preserve origin protection');
  }
  return source.replace(
    handler,
    `${handler}\n  if (event.origin && event.origin !== self.location.origin) {\n    return;\n  }`,
  );
}
