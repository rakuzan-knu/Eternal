export function activeLyricIndex(
  lines: readonly { timeMs: number }[],
  position: number,
  synced: boolean,
) {
  return synced ? lines.findLastIndex((line) => line.timeMs <= position) : -1;
}
