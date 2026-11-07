import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('../build/', import.meta.url);
await mkdir(new URL('icons/', root), { recursive: true });
await mkdir(new URL('appx/', root), { recursive: true });
const sizes = [16, 32, 48, 64, 96, 144, 192, 512];
for (const size of sizes) {
  const image = await readFile(new URL(`../../web/public/icons/icon-${size}.png`, import.meta.url));
  await writeFile(new URL(`icons/${size}x${size}.png`, root), image);
}
const png = await readFile(new URL('icons/512x512.png', root));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [name, width, height] of [
    ['icons/256x256.png', 256, 256],
    ['icons/1024x1024.png', 1024, 1024],
    ['appx/StoreLogo.png', 50, 50],
    ['appx/Square150x150Logo.png', 150, 150],
    ['appx/Square44x44Logo.png', 44, 44],
    ['appx/Wide310x150Logo.png', 310, 150],
  ] as const) {
    const data = await page.evaluate(
      async ({ source, width, height }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Image conversion unavailable');
        context.imageSmoothingQuality = 'high';
        const size = Math.min(width, height);
        context.drawImage(image, (width - size) / 2, (height - size) / 2, size, size);
        return canvas.toDataURL('image/png').split(',')[1];
      },
      { source: `data:image/png;base64,${png.toString('base64')}`, width, height },
    );
    await writeFile(new URL(name, root), Buffer.from(data, 'base64'));
  }
} finally {
  await browser.close();
}
const icoSizes = [16, 32, 48, 64, 256];
const images = await Promise.all(
  icoSizes.map((size) => readFile(new URL(`icons/${size}x${size}.png`, root))),
);
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((buffer, index) => {
  const position = 6 + index * 16;
  header[position] = icoSizes[index] === 256 ? 0 : icoSizes[index];
  header[position + 1] = icoSizes[index] === 256 ? 0 : icoSizes[index];
  header.writeUInt16LE(1, position + 4);
  header.writeUInt16LE(32, position + 6);
  header.writeUInt32LE(buffer.length, position + 8);
  header.writeUInt32LE(offset, position + 12);
  offset += buffer.length;
});
await writeFile(new URL('icon.ico', root), Buffer.concat([header, ...images]));
const large = await readFile(new URL('icons/1024x1024.png', root));
const icns = Buffer.alloc(8);
icns.write('icns', 0);
icns.writeUInt32BE(24 + png.length + large.length, 4);
const chunk = (kind: string, data: Buffer) => {
  const header = Buffer.alloc(8);
  header.write(kind);
  header.writeUInt32BE(8 + data.length, 4);
  return Buffer.concat([header, data]);
};
await writeFile(
  new URL('icon.icns', root),
  Buffer.concat([icns, chunk('ic09', png), chunk('ic10', large)]),
);
console.info(`Desktop icons generated in ${fileURLToPath(root)}`);
