import { describe, it, expect } from 'vitest';
import { detectCodeSnippet } from '../smartCodeDetection';

describe('detectCodeSnippet', () => {
  it('returns isCode: false for short messages', () => {
    const text = 'Hello\nHow are you?\nI am good.';
    const result = detectCodeSnippet(text);
    expect(result.isCode).toBe(false);
  });

  it('detects C++ code snippets with > 5 lines', () => {
    const cppCode = [
      '#include <iostream>',
      '#include <vector>',
      'using namespace std;',
      'int main() {',
      '    cout << "Hello World!" << endl;',
      '    return 0;',
      '}',
    ].join('\n');

    const result = detectCodeSnippet(cppCode);
    expect(result.isCode).toBe(true);
    expect(result.language).toBe('cpp');
    expect(result.extension).toBe('cpp');
    expect(result.lineCount).toBe(7);
  });

  it('detects Python code snippets with > 5 lines', () => {
    const pyCode = [
      'import os',
      'import sys',
      'def calculate_metrics(data):',
      '    result = []',
      '    for item in data:',
      '        result.append(item * 2)',
      '    return result',
    ].join('\n');

    const result = detectCodeSnippet(pyCode);
    expect(result.isCode).toBe(true);
    expect(result.language).toBe('python');
    expect(result.extension).toBe('py');
  });

  it('detects TypeScript / TSX code snippets with > 5 lines', () => {
    const tsxCode = [
      'import React, { useState } from "react";',
      'interface Props {',
      '  title: string;',
      '}',
      'export const Component: React.FC<Props> = ({ title }) => {',
      '  const [count, setCount] = useState(0);',
      '  return <div className="card">{title}: {count}</div>;',
      '};',
    ].join('\n');

    const result = detectCodeSnippet(tsxCode);
    expect(result.isCode).toBe(true);
    expect(result.language).toBe('tsx');
    expect(result.extension).toBe('tsx');
  });

  it('detects HTML snippets with > 5 lines', () => {
    const htmlCode = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head><title>Test</title></head>',
      '<body>',
      '  <div class="main-container">',
      '    <p>Hello HTML</p>',
      '  </div>',
      '</body>',
      '</html>',
    ].join('\n');

    const result = detectCodeSnippet(htmlCode);
    expect(result.isCode).toBe(true);
    expect(result.language).toBe('html');
    expect(result.extension).toBe('html');
  });
});
