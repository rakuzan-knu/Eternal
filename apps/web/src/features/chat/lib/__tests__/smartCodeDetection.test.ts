import { describe, it, expect } from 'vitest';
import { detectCodeSnippet } from '../smartCodeDetection';

describe('detectCodeSnippet', () => {
  it('returns isCode: false for empty, null, or short messages', () => {
    expect(detectCodeSnippet('')).toEqual({
      isCode: false,
      language: '',
      extension: 'txt',
      lineCount: 0,
      rawCode: '',
    });
    expect(detectCodeSnippet(null as any)).toEqual({
      isCode: false,
      language: '',
      extension: 'txt',
      lineCount: 0,
      rawCode: '',
    });

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

  it('detects Java, C#, Rust, Go, and PHP snippets', () => {
    const javaCode =
      'public class Main {\npublic static void main(String[] args) {\nSystem.out.println("hi");\n}\n// line 5\n// line 6\n}';
    expect(detectCodeSnippet(javaCode).language).toBe('java');

    const csCode =
      'using System;\nnamespace MyApp {\npublic class Program {\nstatic void Main() {}\n}\n// line 6\n}';
    expect(detectCodeSnippet(csCode).language).toBe('csharp');

    const rustCode =
      'fn main() {\nlet mut x = 5;\nprintln!("x = {}", x);\n// line 4\n// line 5\n// line 6\n}';
    expect(detectCodeSnippet(rustCode).language).toBe('rust');

    const goCode = 'package main\nimport (\n"fmt"\n)\nfunc main() {\nfmt.Println("hi")\n}';
    expect(detectCodeSnippet(goCode).language).toBe('go');

    const phpCode = '<?php\n$foo = 1;\n$bar = 2;\n$baz = 3;\n$qux = 4;\n$total = $foo + $bar;\n?>';
    expect(detectCodeSnippet(phpCode).language).toBe('php');
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

  it('detects TypeScript / TSX and JavaScript / JSX code snippets', () => {
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
    expect(detectCodeSnippet(tsxCode).language).toBe('tsx');

    const jsxCode = [
      'import React from "react";',
      'export default function Card() {',
      '  const greeting = "Hello";',
      '  return (',
      '    <CustomWrapper>',
      '      <HeaderBanner />',
      '    </CustomWrapper>',
      '  );',
      '}',
    ].join('\n');
    expect(detectCodeSnippet(jsxCode).language).toBe('jsx');

    const tsCode = [
      'const num: number = 42;',
      'let str: string = "hello";',
      'function compute(a: number): number {',
      '  console.log(a);',
      '  return a * 2;',
      '}',
    ].join('\n');
    expect(detectCodeSnippet(tsCode).language).toBe('typescript');

    const jsCode = [
      'const a = 1;',
      'let b = 2;',
      'function sum(x, y) {',
      '  console.log("summing");',
      '  return x + y;',
      '}',
    ].join('\n');
    expect(detectCodeSnippet(jsCode).language).toBe('javascript');
  });

  it('detects HTML, SQL, CSS, and JSON snippets', () => {
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
    expect(detectCodeSnippet(htmlCode).language).toBe('html');

    const htmlTagsCode = [
      '<div class="box">',
      '  <span>Text</span>',
      '  <p>Paragraph</p>',
      '  <button>Click</button>',
      '  <input type="text" />',
      '</div>',
    ].join('\n');
    expect(detectCodeSnippet(htmlTagsCode).language).toBe('html');

    const sqlCode = [
      'SELECT id, username, email',
      'FROM users',
      'WHERE is_active = true',
      'ORDER BY created_at DESC',
      'LIMIT 50',
      'OFFSET 0;',
    ].join('\n');
    expect(detectCodeSnippet(sqlCode).language).toBe('sql');

    const cssCode = [
      '.header-panel {',
      '  display: flex;',
      '  background-color: #121215;',
      '  padding: 16px;',
      '  border-radius: 8px;',
      '}',
    ].join('\n');
    expect(detectCodeSnippet(cssCode).language).toBe('css');

    const jsonCode = JSON.stringify({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }, null, 2);
    expect(detectCodeSnippet(jsonCode).language).toBe('json');

    const jsonArrayCode = JSON.stringify([1, 2, 3, 4, 5, 6, 7], null, 2);
    expect(detectCodeSnippet(jsonArrayCode).language).toBe('json');

    const invalidJsonCode =
      '{\n  invalid json without quotes:\n  val1,\n  val2,\n  val3,\n  val4\n}';
    expect(detectCodeSnippet(invalidJsonCode).isCode).toBe(false);
  });
});
