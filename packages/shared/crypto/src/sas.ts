export const SAS_EMOJI_TABLE: readonly string[] = [
  '🦊',
  '🐱',
  '🐶',
  '🦁',
  '🐯',
  '🐻',
  '🐼',
  '🐨',
  '🐸',
  '🐙',
  '🦋',
  '🦄',
  '🐝',
  '🐬',
  '🦉',
  '🦅',
  '🚀',
  '⚡',
  '🔥',
  '🌟',
  '💎',
  '🛡️',
  '🎯',
  '⚓',
  '🔮',
  '🎸',
  '🎨',
  '🍕',
  '🍉',
  '🍒',
  '🍦',
  '🍩',
  '🍫',
  '☕',
  '🚗',
  '✈️',
  '⛵',
  '🛸',
  '🏰',
  '🏝️',
  '🌋',
  '⛺',
  '🎈',
  '🎁',
  '🏆',
  '🥇',
  '👑',
  '💍',
  '🎮',
  '🎲',
  '🏀',
  '⚽',
  '🎾',
  '🥊',
  '🎧',
  '📷',
  '💡',
  '🔑',
  '🧭',
  '⏰',
  '🌈',
  '☀️',
  '🌙',
  '🌊',
];

/**
 * Derives a deterministic Short Authentication String (SAS) emoji tuple
 * from a cryptographic hash/fingerprint for out-of-band MitM verification.
 */
export function deriveSasEmojis(hashBytes: Uint8Array, count = 4): string[] {
  const emojis: string[] = [];
  const tableLength = SAS_EMOJI_TABLE.length;

  for (let i = 0; i < count; i++) {
    const byte = hashBytes[i % hashBytes.length] ?? 0;
    const index = (byte + (hashBytes[(i + 7) % hashBytes.length] ?? 0)) % tableLength;
    emojis.push(SAS_EMOJI_TABLE[index] ?? '🛡️');
  }

  return emojis;
}
