export interface ConsoleMessage {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  text: string;
  timestamp: number;
}

export const RUNNABLE_LANGS = new Set([
  'html',
  'htm',
  'xhtml',
  'svg',
  'xml',
  'javascript',
  'js',
  'jsx',
  'typescript',
  'ts',
  'tsx',
  'css',
]);

export function isRunnableLanguage(lang: string): boolean {
  const normalized = lang.toLowerCase().trim();
  return RUNNABLE_LANGS.has(normalized);
}
