export interface DetectedCodeSnippet {
  isCode: boolean;
  language: string;
  extension: string;
  lineCount: number;
  rawCode: string;
}

const LANGUAGE_EXT_MAP: Record<string, string> = {
  tsx: 'tsx',
  typescript: 'ts',
  javascript: 'js',
  jsx: 'jsx',
  python: 'py',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  rust: 'rs',
  go: 'go',
  html: 'html',
  css: 'css',
  sql: 'sql',
  php: 'php',
  bash: 'sh',
  json: 'json',
  markdown: 'md',
};

export function detectCodeSnippet(text: string): DetectedCodeSnippet {
  if (!text || typeof text !== 'string') {
    return { isCode: false, language: '', extension: 'txt', lineCount: 0, rawCode: '' };
  }

  const lines = text.split('\n');
  const lineCount = lines.length;

  // Must have more than 5-6 lines to trigger smart paste dialog
  if (lineCount <= 5) {
    return { isCode: false, language: '', extension: 'txt', lineCount, rawCode: text };
  }

  const trimmed = text.trim();

  // Pattern checks
  let language = '';

  if (/(#include\s*<[a-z0-9_.]+>|std::|int\s+main\s*\(|cout\s*<<|printf\s*\()/i.test(trimmed)) {
    language = 'cpp';
  } else if (/\b(using\s+System|namespace\s+\w+|public\s+class\s+\w+\s*:\s*\w+)\b/.test(trimmed)) {
    language = 'csharp';
  } else if (
    /\b(public\s+class\s+\w+|public\s+static\s+void\s+main|System\.out\.println)\b/.test(trimmed)
  ) {
    language = 'java';
  } else if (/\b(fn\s+\w+\s*\(|let\s+mut\s+|impl\s+\w+|use\s+std::|println!\s*\()/i.test(trimmed)) {
    language = 'rust';
  } else if (/\b(package\s+\w+|func\s+\w+\s*\(|import\s+\(|fmt\.Print)/.test(trimmed)) {
    language = 'go';
  } else if (/<\?php|\$[a-zA-Z0-9_]+\s*=/i.test(trimmed)) {
    language = 'php';
  } else if (
    /\b(def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|class\s+\w+:|elif\s+|if\s+__name__\s*==)/.test(
      trimmed,
    )
  ) {
    language = 'python';
  } else if (
    /\b(function\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*=\s*(?:=>|\(|function|\{)|import\s+.*from\s+['"]|export\s+(?:default\s+)?(?:function|class|const))/.test(
      trimmed,
    )
  ) {
    language = /:\s*(?:string|number|boolean|any|void|\w+<.*>)\b/.test(trimmed)
      ? 'typescript'
      : 'javascript';
    if (/<[A-Z]\w+.*>|<\/[A-Z]\w+>/.test(trimmed)) {
      language = language === 'typescript' ? 'tsx' : 'jsx';
    }
  } else if (
    /SELECT\s+.*\s+FROM|INSERT\s+INTO|CREATE\s+TABLE|UPDATE\s+.*\s+SET|DELETE\s+FROM/i.test(trimmed)
  ) {
    language = 'sql';
  } else if (/<!DOCTYPE\s+html|<html|<div|<body|<head/i.test(trimmed)) {
    language = 'html';
  } else if (/(?:^|\n)\s*[.#][\w-]+\s*\{[^}]+\}/.test(trimmed)) {
    language = 'css';
  } else if (/^(?:\{[\s\S]*\}|\[[\s\S]*\])$/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      language = 'json';
    } catch {
      // Not valid json
    }
  }

  // Bracket and indentation density heuristic
  if (!language) {
    const curlyBraces = (trimmed.match(/[{}]/g) || []).length;
    const semicolons = (trimmed.match(/;/g) || []).length;
    const indentationRatio = lines.filter((l) => /^\s{2,}|\t/.test(l)).length / lineCount;

    if (curlyBraces >= 4 && (semicolons >= 3 || indentationRatio > 0.4)) {
      language = 'typescript';
    }
  }

  const isCode = Boolean(language);
  const extension = LANGUAGE_EXT_MAP[language] || 'txt';

  return {
    isCode,
    language,
    extension,
    lineCount,
    rawCode: text,
  };
}
