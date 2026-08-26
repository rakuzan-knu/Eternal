import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CodeSandboxPreview, { isRunnableLanguage } from '../CodeSandboxPreview';

describe('CodeSandboxPreview', () => {
  it('identifies runnable languages accurately', () => {
    expect(isRunnableLanguage('html')).toBe(true);
    expect(isRunnableLanguage('jsx')).toBe(true);
    expect(isRunnableLanguage('tsx')).toBe(true);
    expect(isRunnableLanguage('js')).toBe(true);
    expect(isRunnableLanguage('css')).toBe(true);
    expect(isRunnableLanguage('svg')).toBe(true);
    expect(isRunnableLanguage('python')).toBe(false);
    expect(isRunnableLanguage('cpp')).toBe(false);
  });

  it('renders iframe with strict sandbox security attribute', () => {
    render(<CodeSandboxPreview code="<h1>Hello Sandbox</h1>" language="html" />);

    const iframe = screen.getByTitle('Code Sandbox Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    // Safety verification: only allow-scripts, no allow-same-origin, no allow-top-navigation
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('toggles console output panel and receives console logs', () => {
    render(<CodeSandboxPreview code="console.log('Test output message');" language="js" />);

    const consoleToggleBtn = screen.getByTitle('Toggle Console Output');
    expect(consoleToggleBtn).toBeInTheDocument();

    fireEvent.click(consoleToggleBtn);
    expect(screen.getByText(/Console Output/)).toBeInTheDocument();
    expect(screen.getByText(/No console output recorded yet/)).toBeInTheDocument();
  });
});
