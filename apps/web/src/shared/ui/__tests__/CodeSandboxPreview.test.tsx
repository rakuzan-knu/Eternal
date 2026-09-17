import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CodeSandboxPreview from '../CodeSandboxPreview';
import { isRunnableLanguage } from '../../lib/codeSandboxUtils';

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

  it('renders iframe with strict sandbox security attribute for various languages', () => {
    // HTML snippet
    const { rerender } = render(
      <CodeSandboxPreview code="<h1>Hello Sandbox</h1>" language="html" />,
    );
    const iframe = screen.getByTitle('Code Sandbox Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');

    // Full HTML document with <head>
    rerender(
      <CodeSandboxPreview
        code="<!DOCTYPE html><html><head><title>Test</title></head><body>Doc</body></html>"
        language="html"
      />,
    );
    expect(iframe.srcdoc).toContain('<title>Test</title>');

    // Full HTML document without <head>
    rerender(<CodeSandboxPreview code="<html><body>No head</body></html>" language="html" />);
    expect(iframe.srcdoc).toContain('No head');

    // CSS snippet
    rerender(<CodeSandboxPreview code=".btn { color: red; }" language="css" />);
    expect(iframe.srcdoc).toContain('.btn { color: red; }');

    // TSX snippet
    rerender(
      <CodeSandboxPreview
        code="import React from 'react'; export default function App() { return <div>App</div>; }"
        language="tsx"
      />,
    );
    expect(iframe.srcdoc).toContain('React Preview');
  });

  it('toggles console output panel, receives logs from postMessage and clears logs', () => {
    render(<CodeSandboxPreview code="console.log('Test output message');" language="js" />);

    const consoleToggleBtn = screen.getByTitle('Toggle Console Output');
    expect(consoleToggleBtn).toBeInTheDocument();

    // Trigger reload
    const reloadBtn = screen.getByTitle('Reload sandbox preview');
    fireEvent.click(reloadBtn);

    // Open console
    fireEvent.click(consoleToggleBtn);
    expect(screen.getByText(/Console Output/)).toBeInTheDocument();
    expect(screen.getByText(/No console output recorded yet/)).toBeInTheDocument();

    // Extract instanceId from iframe srcDoc
    const iframe = screen.getByTitle('Code Sandbox Preview') as HTMLIFrameElement;
    const match = iframe.srcdoc.match(/sandbox-[a-z0-9]+/);
    const instanceId = match ? match[0] : '';

    // Post log message
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'null',
          source: iframe.contentWindow,
          data: {
            type: 'SANDBOX_CONSOLE_LOG',
            instanceId,
            level: 'log',
            text: 'Hello from sandbox',
          },
        }),
      );
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'null',
          source: iframe.contentWindow,
          data: {
            type: 'SANDBOX_CONSOLE_LOG',
            instanceId,
            level: 'warn',
            text: 'Warning from sandbox',
          },
        }),
      );
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'null',
          source: iframe.contentWindow,
          data: {
            type: 'SANDBOX_CONSOLE_LOG',
            instanceId,
            level: 'error',
            text: 'Error from sandbox',
          },
        }),
      );
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'null',
          source: iframe.contentWindow,
          data: {
            type: 'SANDBOX_CONSOLE_LOG',
            instanceId,
            level: 'info',
            text: 'Info from sandbox',
          },
        }),
      );
    });

    expect(screen.getByText('Hello from sandbox')).toBeInTheDocument();
    expect(screen.getByText('Warning from sandbox')).toBeInTheDocument();
    expect(screen.getByText('Error from sandbox')).toBeInTheDocument();
    expect(screen.getByText('Info from sandbox')).toBeInTheDocument();

    // Clear logs
    const clearBtn = screen.getByTitle('Clear console');
    fireEvent.click(clearBtn);
    expect(screen.getByText(/No console output recorded yet/)).toBeInTheDocument();
  });

  it('renders purple badge when console messages exist with zero errors', () => {
    render(<CodeSandboxPreview code="console.log('Only log');" language="js" />);
    const iframe = screen.getByTitle('Code Sandbox Preview') as HTMLIFrameElement;
    const match = iframe.srcdoc.match(/sandbox-[a-z0-9]+/);
    const instanceId = match ? match[0] : '';

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'null',
          source: iframe.contentWindow,
          data: {
            type: 'SANDBOX_CONSOLE_LOG',
            instanceId,
            level: 'log',
            text: 'Just a normal log',
          },
        }),
      );
    });

    const consoleBtn = screen.getByTitle('Toggle Console Output');
    expect(consoleBtn).toHaveClass('bg-purple-500/20');
  });
});
