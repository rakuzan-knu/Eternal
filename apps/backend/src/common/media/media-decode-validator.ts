import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let activeDecoders = 0;

/** Decode all audio/video packets in a bounded child process before persisting uploads. */
export async function validateMediaDecoding(buffer: Buffer): Promise<void> {
  if (!Buffer.isBuffer(buffer) || buffer.byteLength === 0) {
    throw new BadRequestException('This media file is damaged or cannot be decoded');
  }
  const MAX_VALIDATION_BYTES = 100 * 1024 * 1024; // 100MB
  if (buffer.byteLength > MAX_VALIDATION_BYTES) {
    throw new BadRequestException('Media payload exceeds maximum permitted size');
  }
  if (activeDecoders >= 2) {
    throw new ServiceUnavailableException('Media processing is busy. Please try again.');
  }
  activeDecoders++;
  let directory: string | undefined;
  try {
    let input: string;
    try {
      directory = await mkdtemp(join(tmpdir(), 'media-validation-'));
      input = join(directory, 'upload');
      await writeFile(input, buffer, { mode: 0o600 });
    } catch {
      throw new ServiceUnavailableException('Media processing is unavailable. Please try again.');
    }
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.env.FFMPEG_PATH || 'ffmpeg',
        [
          '-hide_banner',
          '-nostdin',
          '-v',
          'error',
          '-xerror',
          '-max_alloc',
          '268435456',
          '-err_detect',
          'explode',
          '-threads',
          '1',
          '-filter_threads',
          '1',
          '-protocol_whitelist',
          'file,pipe',
          '-i',
          input,
          '-map',
          '0:v:0?',
          '-map',
          '0:a:0?',
          '-sn',
          '-dn',
          '-threads',
          '1',
          '-filter_threads',
          '1',
          '-f',
          'null',
          '-',
        ],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      // Drain diagnostics without retaining untrusted file data or server paths.
      let stderr = '';
      child.stdout.resume();
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      const timeout = setTimeout(() => child.kill('SIGKILL'), 30_000);
      child.once('error', () => {
        clearTimeout(timeout);
        reject(
          new ServiceUnavailableException('Media processing is unavailable. Please try again.'),
        );
      });
      child.once('close', (code) => {
        clearTimeout(timeout);
        if (
          code === 0 &&
          !stderr.includes('Error') &&
          !stderr.includes('corrupt') &&
          !stderr.includes('invalid')
        ) {
          resolve();
        } else {
          reject(new BadRequestException('This media file is damaged or cannot be decoded'));
        }
      });
    });
  } finally {
    if (directory) {
      await unlink(join(directory, 'upload')).catch(() => undefined);
      await rmdir(directory).catch(() => undefined);
    }
    activeDecoders--;
  }
}
