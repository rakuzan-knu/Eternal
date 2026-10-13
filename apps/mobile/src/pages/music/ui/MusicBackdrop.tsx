import * as React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const palettes = [
  ['#402763', '#18162c', '#090b13'],
  ['#194846', '#172633', '#090b13'],
  ['#542d43', '#251929', '#090b13'],
  ['#2d3d62', '#1b1d38', '#090b13'],
] as const;
export function musicGradient(seed: string) {
  let hash = 0;
  for (const letter of seed) hash = (hash * 31 + letter.charCodeAt(0)) | 0;
  return palettes[Math.abs(hash) % palettes.length];
}
/** Static gradients: no blur, animation loop or image decoding while gaming. */
export function MusicBackdrop({ seed }: { seed: string }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={musicGradient(seed)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
