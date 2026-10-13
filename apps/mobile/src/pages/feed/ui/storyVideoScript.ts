/** Encode data as a JavaScript string literal, including inside an HTML script element. */
export function storyVideoStringLiteral(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function storyVideoSyncScript(active: boolean, volume: unknown, css: string): string {
  const safeVolume =
    typeof volume === 'number' && Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;
  const cssLiteral = storyVideoStringLiteral(css);
  return `(function(){const v=document.querySelector('video');if(v){v.volume=${safeVolume};v.style.filter=${cssLiteral};${active ? 'v.play().catch(function(){});' : 'v.pause();'}}})();true;`;
}
