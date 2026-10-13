import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedVideoPacketSource,
  EncodedPacket,
  Output,
  WebMOutputFormat,
} from 'mediabunny';

export const pngImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWP4b5z23ziNAUIBAC8SBmFRgYV9AAAAAElFTkSuQmCC',
  'base64',
);
export const gifImage = Buffer.from(
  'R0lGODlhAgACAIAAAExpcf8zZiH5BAUAAAAALAAAAAACAAIAAAICjFMAOw==',
  'base64',
);
export const sampleVideo = () =>
  readFile(resolve(process.cwd(), '../web/public/videos/sample-reel.mp4'));
export const sampleAudio = () =>
  readFile(resolve(process.cwd(), '../web/public/sounds/message-received.wav'));

export async function voiceWebm(packet = new Uint8Array([0xf8, 0xff, 0xfe])): Promise<Buffer> {
  const target = new BufferTarget();
  const output = new Output({ target, format: new WebMOutputFormat() });
  const source = new EncodedAudioPacketSource('opus');
  output.addAudioTrack(source);
  await output.start();
  await source.add(new EncodedPacket(packet, 'key', 0, 0.02), {
    decoderConfig: { codec: 'opus', sampleRate: 48000, numberOfChannels: 1 },
  });
  source.close();
  await output.finalize();
  return Buffer.from(target.buffer!);
}

export async function damagedVideoWebm(): Promise<Buffer> {
  const target = new BufferTarget();
  const output = new Output({ target, format: new WebMOutputFormat() });
  const source = new EncodedVideoPacketSource('vp8');
  output.addVideoTrack(source);
  await output.start();
  await source.add(new EncodedPacket(new Uint8Array([0xff]), 'key', 0, 0.04), {
    decoderConfig: { codec: 'vp8', codedWidth: 2, codedHeight: 2 },
  });
  source.close();
  await output.finalize();
  return Buffer.from(target.buffer!);
}
