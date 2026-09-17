/**
 * Ultra-fast zero-dependency BlurHash decoder.
 * Converts compact BlurHash strings into raw pixel data and canvas bitmaps
 * to eliminate Cumulative Layout Shift (CLS) and provide instant placeholders.
 */

const digitCharacters =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function decode83(str: string): number {
  let value = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const digit = digitCharacters.indexOf(c);
    if (digit === -1) return 0;
    value = value * 83 + digit;
  }
  return value;
}

function sRGBToLinear(value: number): number {
  const v = value / 255;
  if (v <= 0.04045) return v / 12.92;
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearTosRGB(value: number): number {
  const v = Math.max(0, Math.min(1, value));
  if (v <= 0.0031308) return Math.trunc(v * 12.92 * 255 + 0.5);
  return Math.trunc((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
}

function sign(n: number): number {
  return n < 0 ? -1 : 1;
}

function signPow(val: number, exp: number): number {
  return sign(val) * Math.pow(Math.abs(val), exp);
}

function decodeDC(value: number): [number, number, number] {
  const intR = value >> 16;
  const intG = (value >> 8) & 255;
  const intB = value & 255;
  return [sRGBToLinear(intR), sRGBToLinear(intG), sRGBToLinear(intB)];
}

function decodeAC(value: number, maximumValue: number): [number, number, number] {
  const quantR = Math.trunc(value / (19 * 19));
  const quantG = Math.trunc(value / 19) % 19;
  const quantB = value % 19;

  const rgb: [number, number, number] = [
    signPow((quantR - 9) / 9, 2.0) * maximumValue,
    signPow((quantG - 9) / 9, 2.0) * maximumValue,
    signPow((quantB - 9) / 9, 2.0) * maximumValue,
  ];

  return rgb;
}

/**
 * Decodes a BlurHash string into an RGBA Uint8ClampedArray of dimensions width x height.
 */
export function decodeBlurHash(
  blurhash: string,
  width: number,
  height: number,
  punch = 1,
): Uint8ClampedArray | null {
  if (!blurhash || blurhash.length < 6) return null;

  try {
    const sizeFlag = decode83(blurhash[0]);
    const numY = Math.trunc(sizeFlag / 9) + 1;
    const numX = (sizeFlag % 9) + 1;

    if (blurhash.length < 4 + 2 * numX * numY) {
      return null;
    }

    const quantisedMaximumValue = decode83(blurhash[1]);
    const maximumValue = ((quantisedMaximumValue + 1) / 166) * punch;

    const colors = new Array(numX * numY);
    colors[0] = decodeDC(decode83(blurhash.substring(2, 6)));

    for (let i = 1; i < numX * numY; i++) {
      const value = decode83(blurhash.substring(4 + i * 2, 6 + i * 2));
      colors[i] = decodeAC(value, maximumValue);
    }

    const bytesPerRow = width * 4;
    const pixels = new Uint8ClampedArray(bytesPerRow * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0;
        let g = 0;
        let b = 0;

        for (let j = 0; j < numY; j++) {
          for (let i = 0; i < numX; i++) {
            const basis =
              Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
            const color = colors[i + j * numX];
            r += color[0] * basis;
            g += color[1] * basis;
            b += color[2] * basis;
          }
        }

        const pixelIndex = (y * width + x) * 4;
        pixels[pixelIndex] = linearTosRGB(r);
        pixels[pixelIndex + 1] = linearTosRGB(g);
        pixels[pixelIndex + 2] = linearTosRGB(b);
        pixels[pixelIndex + 3] = 255;
      }
    }

    return pixels;
  } catch {
    return null;
  }
}
