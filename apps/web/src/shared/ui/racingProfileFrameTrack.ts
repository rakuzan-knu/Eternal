const TAU = Math.PI * 2;
const wrap = (n: number) => ((n % 1) + 1) % 1;

/** Arc-length track; time remapping eases into corners without a speed discontinuity. */
export function createRacingTrack(width: number, height: number, radius: number, inset = 0) {
  const w = Math.max(2, width - inset * 2),
    h = Math.max(2, height - inset * 2);
  const r = Math.max(1, Math.min(radius, w / 2, h / 2));
  const horizontal = w - 2 * r,
    vertical = h - 2 * r,
    quarter = (Math.PI * r) / 2;
  const lengths = [horizontal, quarter, vertical, quarter, horizontal, quarter, vertical, quarter];
  const perimeter = lengths.reduce((sum, n) => sum + n, 0);
  function atDistance(distance: number) {
    let d = wrap(distance / perimeter) * perimeter,
      segment = 0;
    while (segment < 7 && d >= lengths[segment]) d -= lengths[segment++];
    let x: number, y: number, heading: number;
    if (segment % 2 === 0) {
      switch (segment) {
        case 0:
          x = r + d;
          y = 0;
          heading = 0;
          break;
        case 2:
          x = w;
          y = r + d;
          heading = Math.PI / 2;
          break;
        case 4:
          x = w - r - d;
          y = h;
          heading = Math.PI;
          break;
        default:
          x = 0;
          y = h - r - d;
          heading = (3 * Math.PI) / 2;
      }
    } else {
      const corner = (segment - 1) / 2;
      const angle = -Math.PI / 2 + (corner * Math.PI) / 2 + d / r;
      const cx = corner < 2 ? w - r : r,
        cy = corner === 0 || corner === 3 ? r : h - r;
      x = cx + Math.cos(angle) * r;
      y = cy + Math.sin(angle) * r;
      heading = angle + Math.PI / 2;
    }
    return {
      x: x + inset,
      y: y + inset,
      heading: ((heading % TAU) + TAU) % TAU,
      distance: wrap(distance / perimeter) * perimeter,
      corner: segment % 2 !== 0,
    };
  }
  const bins = 1024;
  const cornerSpeed = Array.from({ length: bins }, (_, i) =>
    atDistance((i * perimeter) / bins).corner ? 0.68 : 1,
  );
  const times = [0];
  for (let i = 0; i < bins; i++) {
    let speed = 0,
      weight = 0;
    for (let j = -16; j <= 16; j++) {
      const k = 17 - Math.abs(j);
      speed += cornerSpeed[(i + j + bins) % bins] * k;
      weight += k;
    }
    times.push(times[i] + 1 / (speed / weight));
  }
  const total = times[bins];
  return {
    perimeter,
    atDistance,
    sample(phase: number) {
      const target = wrap(phase) * total;
      let lo = 0,
        hi = bins;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= target) lo = mid;
        else hi = mid;
      }
      const fraction = (target - times[lo]) / (times[hi] - times[lo]);
      return atDistance(((lo + fraction) * perimeter) / bins);
    },
  };
}

export function racingAtlasPose(heading: number, distance: number, carSize: number) {
  const tileHeading = Math.round((heading / TAU) * 64) % 64;
  const wheelPhase = Math.floor(distance / Math.max(1, carSize * 0.14)) % 2;
  const tile = tileHeading + wheelPhase * 64;
  let residual = heading - (tileHeading * TAU) / 64;
  if (residual > Math.PI) residual -= TAU;
  return { column: tile % 16, row: Math.floor(tile / 16), residual: (residual * 180) / Math.PI };
}
