import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CodeBlock from '../CodeBlock';

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders language badge and lines count', () => {
    const code = 'const greeting = "Hello world";\nconsole.log(greeting);';
    render(<CodeBlock language="typescript" value={code} />);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText(/2 lines/)).toBeInTheDocument();
  });

  it('copies raw code to clipboard on Copy button click', async () => {
    const code = 'function add(a, b) {\n  return a + b;\n}';
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CodeBlock language="javascript" value={code} />);

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    expect(copyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(code);
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('triggers download with correct file extension', () => {
    const code = '#include <iostream>\nint main() { return 0; }';
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<CodeBlock language="cpp" value={code} />);

    const downloadBtn = screen.getByTitle('Download as snippet.cpp');
    expect(downloadBtn).toBeInTheDocument();

    fireEvent.click(downloadBtn);
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('shows Code and Preview tabs for runnable languages and switches view', () => {
    const htmlCode = '<div><h1>Preview title</h1></div>';
    render(<CodeBlock language="html" value={htmlCode} />);

    const codeTab = screen.getByRole('button', { name: /code/i });
    const previewTab = screen.getByRole('button', { name: /preview/i });

    expect(codeTab).toBeInTheDocument();
    expect(previewTab).toBeInTheDocument();

    // Switch to Preview
    fireEvent.click(previewTab);
    expect(screen.getByTitle('Code Sandbox Preview')).toBeInTheDocument();

    // Switch back to Code
    fireEvent.click(codeTab);
    expect(screen.queryByTitle('Code Sandbox Preview')).not.toBeInTheDocument();
  });

  it('collapses code longer than 25 lines and expands on button click', () => {
    const longCode = Array.from({ length: 30 }, (_, i) => `const line${i + 1} = ${i + 1};`).join(
      '\n',
    );
    render(<CodeBlock language="typescript" value={longCode} />);

    const expandBtn = screen.getByRole('button', { name: /show full code \(30 lines\)/i });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(screen.getByRole('button', { name: /collapse code/i })).toBeInTheDocument();
  });

  it('renders diff snippets with addition, deletion, and chunk header styling', () => {
    const diffCode = '@@ -1,3 +1,3 @@\n-old line\n+new line\n unchanged line';
    const { container } = render(<CodeBlock language="diff" value={diffCode} />);

    expect(screen.getByText('Diff')).toBeInTheDocument();
    const rows = container.querySelectorAll('.table-row');
    expect(rows[0]).toHaveClass('bg-purple-500/10');
    expect(rows[1]).toHaveClass('bg-rose-500/10');
    expect(rows[2]).toHaveClass('bg-emerald-500/10');
  });
});
