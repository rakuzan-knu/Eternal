import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { highlightMatches } from '../highlightMatches';

describe('highlightMatches', () => {
  it('returns plain text when query is empty or only whitespace', () => {
    expect(highlightMatches('Hello world', '')).toBe('Hello world');
    expect(highlightMatches('Hello world', '   ')).toBe('Hello world');
  });

  it('renders mark tags for matched substrings case-insensitively', () => {
    const { container } = render(
      <div>{highlightMatches('Hello World! hello everyone', 'hello')}</div>,
    );
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('Hello');
    expect(marks[1].textContent).toBe('hello');
  });

  it('handles special regex characters safely without crashing', () => {
    const text = 'Check out (react+vite) [v2]';
    const { container } = render(<div>{highlightMatches(text, '(react+vite)')}</div>);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('(react+vite)');
  });
});
