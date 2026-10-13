/** Average two image regions, darkened to keep story text legible, as in the web editor. */
export function storyPalette(pixels: Uint8Array, width: number, height: number) {
  if (width < 1 || height < 2 || pixels.length !== width * height * 4) return null;
  const colors = [0, 1].map((region) => {
    const rgb = [0, 0, 0];
    let count = 0;
    for (
      let y = region ? Math.floor(height / 2) : 0;
      y < (region ? height : Math.floor(height / 2));
      y++
    ) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        if (!pixels[offset + 3]) continue;
        for (let channel = 0; channel < 3; channel++) rgb[channel] += pixels[offset + channel];
        count++;
      }
    }
    const factor = region ? 0.4 : 0.75;
    return `rgb(${rgb.map((channel) => Math.round((channel / Math.max(1, count)) * factor)).join(', ')})`;
  });
  return `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
}

export function base64Bytes(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const data = value.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((data.length * 6) / 8));
  let accumulator = 0,
    bits = 0,
    index = 0;
  for (const char of data) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid image preview');
    accumulator = (accumulator << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (accumulator >> bits) & 255;
    }
  }
  return bytes;
}
