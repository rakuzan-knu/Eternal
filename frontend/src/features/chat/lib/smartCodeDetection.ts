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
  } else if (
    /\b(public\s+class\s+\w+|public\s+static\s+void\s+main|System\.out\.println)\b/.test(trimmed)
  ) {
    language = 'java';
  } else if (/\b(using\s+System;|namespace\s+\w+|public\s+class\s+\w+\s*:\s*\w+)\b/.test(trimmed)) {
    language = 'csharp';
  } else if (/\b(fn\s+\w+\s*\(|let\s+mut\s+|impl\s+\w+|use\s+std::|println!\s*\()/i.test(trimmed)) {
    language = 'rust';
  } else if (/\b(package\s+\w+|func\s+\w+\s*\(|import\s+\(|fmt\.Print)/.test(trimmed)) {
    language = 'go';
  } else if (/<\?php|\$[a-zA-Z0-9_]+\s*=/i.test(trimmed)) {
    language = 'php';
  } else if (
    /(<!DOCTYPE\s+html|<html\b|<head\b|<body\b|<section\b|<style\b|<script\b)/i.test(trimmed)
  ) {
    language = 'html';
  } else if (
    /(\bimport\s+.*?from\s+['"].*?['"]|export\s+default|export\s+(const|function|interface|type)|<[A-Z]\w+[^>]*\/>|<\/[A-Z]\w+>)/.test(
      trimmed,
    )
  ) {
    language = /interface|type\s+\w+\s*=|:\s*(string|number|boolean|any|React)/.test(trimmed)
      ? 'tsx'
      : 'jsx';
  } else if (
    /\b(const\s+\w+\s*=|let\s+\w+\s*=|function\s+\w+\s*\(|console\.(log|error|warn))\b/.test(
      trimmed,
    )
  ) {
    language = /:\s*(string|number|boolean|any)|as\s+\w+/.test(trimmed)
      ? 'typescript'
      : 'javascript';
  } else if (
    /\b(def\s+\w+\s*\(|class\s+\w+:|import\s+\w+|from\s+\w+\s+import|if\s+__name__\s*==\s*['"]__main__['"]:)\b/.test(
      trimmed,
    )
  ) {
    language = 'python';
  } else if (/(<div\b|<p\b|<span\b|<table\b|<form\b|<button\b|<input\b)/i.test(trimmed)) {
    language = 'html';
  } else if (
    /\b(SELECT\s+.*?FROM|INSERT\s+INTO|CREATE\s+TABLE|ALTER\s+TABLE|UPDATE\s+\w+\s+SET)\b/i.test(
      trimmed,
    )
  ) {
    language = 'sql';
  } else if (
    /(\.[a-zA-Z0-9_-]+\s*\{|#[a-zA-Z0-9_-]+\s*\{|@media\s*\(|display:\s*(flex|grid)|background-color:)/.test(
      trimmed,
    )
  ) {
    language = 'css';
  } else if (
    /^(\s*[{[][\s\S]*[}\]]\s*)$/.test(trimmed) &&
    (trimmed.startsWith('{') || trimmed.startsWith('['))
  ) {
    try {
      JSON.parse(trimmed);
      language = 'json';
    } catch {
      // not valid JSON
    }
  }

  const isCode = Boolean(language);
  const extension = language ? LANGUAGE_EXT_MAP[language] || language : 'txt';

  return {
    isCode,
    language,
    extension,
    lineCount,
    rawCode: text,
  };
}
