import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { inspectMedia } from './media-metadata';

describe('bounded container metadata', () => {
  it('reads the real MP4 fixture without reading its video payload', async () => {
    const bytes = await readFile('../web/public/videos/sample-reel.mp4');
    let readBytes = 0;
    const result = await inspectMedia('video/mp4', bytes.length, async (start, end) => {
      readBytes += end - start + 1;
      return bytes.subarray(start, end + 1);
    });
    expect(result.duration).toBeGreaterThan(0);
    expect(result.duration).toBeLessThanOrEqual(60);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(readBytes).toBeLessThan(256 * 1024 + 512);
  });
  it('rejects a container over the Reel duration limit and accepts the longer non-Reel policy', async () => {
    const bytes = await readFile('../web/public/videos/sample-reel.mp4');
    const mvhd = bytes.indexOf(Buffer.from('mvhd'));
    expect(mvhd).toBeGreaterThan(0);
    expect(bytes[mvhd + 4]).toBe(0);
    const scale = bytes.readUInt32BE(mvhd + 16);
    bytes.writeUInt32BE(61 * scale, mvhd + 20);
    const read = async (start: number, end: number) => bytes.subarray(start, end + 1);
    await expect(inspectMedia('video/mp4', bytes.length, read)).rejects.toMatchObject({
      status: 400,
    });
    await expect(inspectMedia('video/mp4', bytes.length, read, 3600)).resolves.toMatchObject({
      duration: 61,
    });
  });
  it('checks actual image format and dimensions rather than the declared MIME alone', async () => {
    const png = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    const read = async (start: number, end: number) => png.subarray(start, end + 1);
    await expect(inspectMedia('image/png', png.length, read)).resolves.toEqual({
      width: 20,
      height: 10,
    });
    await expect(inspectMedia('image/jpeg', png.length, read)).rejects.toMatchObject({
      status: 400,
    });
    const huge = await sharp({
      create: { width: 4097, height: 1, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    await expect(inspectMedia('image/png', huge.length, async () => huge)).rejects.toMatchObject({
      status: 400,
    });
  });
  it('rejects executable payloads and unprobeable videos', async () => {
    const executable = Buffer.from('<html><script>alert(1)</script></html>');
    for (const mime of ['image/png', 'video/mp4', 'video/webm']) {
      await expect(
        inspectMedia(mime, executable.length, async () => executable),
      ).rejects.toMatchObject({ status: 400 });
    }
  });
});
