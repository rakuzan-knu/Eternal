import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SpreadsheetEditor from '../documentEditors/SpreadsheetEditor';

describe('SpreadsheetEditor', () => {
  const mockSheets = [
    {
      name: 'Sheet 1',
      rows: [
        ['ID', 'Name', 'Score'],
        ['1', 'Alice', '95'],
        ['2', 'Bob', '88'],
        ['3', 'Charlie', '76'],
      ],
      maxCols: 3,
      colWidths: [80, 140, 100],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders spreadsheet with formula bar, column headers, and data cells', () => {
    render(<SpreadsheetEditor initialSheets={mockSheets} fileName="scores.xlsx" />);

    expect(screen.getByText('Sheet 1')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('updates formula bar coordinate pill and fx input when a cell is clicked', () => {
    render(<SpreadsheetEditor initialSheets={mockSheets} fileName="scores.xlsx" />);

    // Click cell "Alice" (Row 1, Col 1 -> B2)
    const aliceCell = screen.getByText('Alice').closest('td')!;
    fireEvent.mouseDown(aliceCell, { button: 0 });

    expect(screen.getByText('B2')).toBeInTheDocument();

    const formulaInput = screen.getByPlaceholderText(
      'Введіть значення ячейки...',
    ) as HTMLInputElement;
    expect(formulaInput.value).toBe('Alice');
  });

  it('supports drag marquee selection across multiple cells and displays range coordinates', () => {
    render(<SpreadsheetEditor initialSheets={mockSheets} fileName="scores.xlsx" />);

    // Start drag on "Alice" (B2)
    const aliceCell = screen.getByText('Alice').closest('td')!;
    fireEvent.mouseDown(aliceCell, { button: 0 });

    // Drag to "76" (C4)
    const charlieScoreCell = screen.getByText('76').closest('td')!;
    fireEvent.mouseEnter(charlieScoreCell);

    // During drag, it shows row x col dimensions: 3R x 2C
    expect(screen.getByText('3R × 2C')).toBeInTheDocument();

    // Mouse up to end dragging -> reveals standard Excel range coordinate B2:C4
    fireEvent.mouseUp(window);
    expect(screen.getByText('B2:C4')).toBeInTheDocument();
  });

  it('applies bold formatting to all cells in the selected range', () => {
    render(<SpreadsheetEditor initialSheets={mockSheets} fileName="scores.xlsx" />);

    // Select range B2:C3 (Alice, Bob and their scores)
    const aliceCell = screen.getByText('Alice').closest('td')!;
    fireEvent.mouseDown(aliceCell, { button: 0 });

    const bobScoreCell = screen.getByText('88').closest('td')!;
    fireEvent.mouseEnter(bobScoreCell);
    fireEvent.mouseUp(window);

    // Click Bold button in toolbar
    const boldBtn = screen.getByTitle(/Жирний/i);
    fireEvent.click(boldBtn);

    // Both Alice and 88 cells should now have font-weight bold
    expect(aliceCell).toHaveStyle({ fontWeight: 'bold' });
    expect(bobScoreCell).toHaveStyle({ fontWeight: 'bold' });
  });

  it('clears contents of all cells in selected range upon pressing Delete key', () => {
    render(<SpreadsheetEditor initialSheets={mockSheets} fileName="scores.xlsx" />);

    // Select range B2:B3 (Alice and Bob)
    const aliceCell = screen.getByText('Alice').closest('td')!;
    fireEvent.mouseDown(aliceCell, { button: 0 });

    const bobCell = screen.getByText('Bob').closest('td')!;
    fireEvent.mouseEnter(bobCell);
    fireEvent.mouseUp(window);

    // Press Delete key
    fireEvent.keyDown(window, { key: 'Delete' });

    // Alice and Bob text should now be cleared
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('highlights column headers when a column or cell range is selected', () => {
    render(<SpreadsheetEditor initialSheets={mockSheets} fileName="scores.xlsx" />);

    // Click column B header
    const colBHeader = screen.getByTitle(/Стовпець B/i);
    fireEvent.click(colBHeader);

    // Column B header should have highlighted class
    expect(colBHeader.className).toContain('border-b-[#107c41]');
    expect(screen.getByText('B:B')).toBeInTheDocument();
  });
});
