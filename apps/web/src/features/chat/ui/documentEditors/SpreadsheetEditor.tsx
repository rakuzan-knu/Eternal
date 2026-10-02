import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Search,
  PaintBucket,
  Palette,
  Check,
  Save,
  Send,
  Download,
  RotateCcw,
} from 'lucide-react';
import { SpreadsheetSheet, CellStyle } from '../../lib/documentParsers';
import { exportSpreadsheetToXlsx } from '../../lib/documentExporters';

interface SpreadsheetEditorProps {
  initialSheets: SpreadsheetSheet[];
  fileName: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (total: number) => void;
  onSave?: (editedFile: File) => void;
  onSendDirectly?: (editedFile: File) => void;
  onDownload?: (editedFile: File) => void;
}

interface CellCoord {
  row: number;
  col: number;
}

interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

const FILL_COLORS = [
  '#ffffff', // White
  '#fef08a', // Light Yellow
  '#bbf7d0', // Light Green
  '#bfdbfe', // Light Blue
  '#fecaca', // Light Red
  '#e9d5ff', // Light Purple
  '#fed7aa', // Light Orange
  '#e2e8f0', // Light Slate
];

const TEXT_COLORS = [
  '#000000', // Black
  '#1e293b', // Slate
  '#1d4ed8', // Blue
  '#15803d', // Green
  '#b91c1c', // Red
  '#7e22ce', // Purple
];

export default function SpreadsheetEditor({
  initialSheets,
  fileName,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  onSave,
  onSendDirectly,
  onDownload,
}: SpreadsheetEditorProps) {
  const [sheets, setSheets] = useState<SpreadsheetSheet[]>(() => {
    // Deep clone initial sheets so edits are completely isolated
    return initialSheets.map((s) => ({
      name: s.name,
      rows: s.rows.map((r) => [...r]),
      maxCols: Math.max(s.maxCols || 10, s.rows[0]?.length || 10),
      cellStyles: s.cellStyles ? { ...s.cellStyles } : {},
      colWidths: s.colWidths ? [...s.colWidths] : undefined,
      rowHeights: s.rowHeights ? [...s.rowHeights] : undefined,
      colStyles: s.colStyles ? { ...s.colStyles } : {},
    }));
  });

  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const currentSheet = sheets[activeSheetIndex] || sheets[0];

  // Selection states: range selection (drag selection like Excel), column, or row
  const [selectedRange, setSelectedRange] = useState<SelectionRange | null>(null);
  const [anchorCell, setAnchorCell] = useState<CellCoord | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellCoord | null>(null);

  const [editingCell, setEditingCell] = useState<CellCoord | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Column and Row Resizing state
  const [resizingCol, setResizingCol] = useState<{
    index: number;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [resizingRow, setResizingRow] = useState<{
    index: number;
    startY: number;
    startHeight: number;
  } | null>(null);

  // Click-to-toggle Color Pickers
  const [isFillPickerOpen, setIsFillPickerOpen] = useState(false);
  const [isTextColorPickerOpen, setIsTextColorPickerOpen] = useState(false);
  const fillPickerRef = useRef<HTMLDivElement>(null);
  const textColorPickerRef = useRef<HTMLDivElement>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'row' | 'col' | 'cell';
    index: number;
    colIndex?: number;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Synchronize active sheet when parent changes currentPage
  useEffect(() => {
    if (currentPage && currentPage >= 1 && currentPage <= sheets.length) {
      if (activeSheetIndex !== currentPage - 1) {
        setActiveSheetIndex(currentPage - 1);
        setSelectedCell(null);
        setSelectedRange(null);
        setAnchorCell(null);
        setSelectedColIndex(null);
        setSelectedRowIndex(null);
      }
    }
  }, [currentPage, sheets.length, activeSheetIndex]);

  // Focus inline edit input
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      cellInputRef.current.select();
    }
  }, [editingCell]);

  // Close context menu and color pickers on global click outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      setContextMenu(null);
      if (fillPickerRef.current && !fillPickerRef.current.contains(e.target as Node)) {
        setIsFillPickerOpen(false);
      }
      if (textColorPickerRef.current && !textColorPickerRef.current.contains(e.target as Node)) {
        setIsTextColorPickerOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Global mousemove/mouseup listener for column and row resizing
  useEffect(() => {
    if (!resizingCol && !resizingRow) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol) {
        const deltaX = e.clientX - resizingCol.startX;
        const newWidth = Math.max(50, Math.min(600, resizingCol.startWidth + deltaX));
        setSheets((prev) => {
          const next = [...prev];
          const s = { ...next[activeSheetIndex] };
          const colWidths = [...(s.colWidths || [])];
          while (colWidths.length <= resizingCol.index) colWidths.push(110);
          colWidths[resizingCol.index] = newWidth;
          s.colWidths = colWidths;
          next[activeSheetIndex] = s;
          return next;
        });
      } else if (resizingRow) {
        const deltaY = e.clientY - resizingRow.startY;
        const newHeight = Math.max(22, Math.min(300, resizingRow.startHeight + deltaY));
        setSheets((prev) => {
          const next = [...prev];
          const s = { ...next[activeSheetIndex] };
          const rowHeights = [...(s.rowHeights || [])];
          while (rowHeights.length <= resizingRow.index) rowHeights.push(30);
          rowHeights[resizingRow.index] = newHeight;
          s.rowHeights = rowHeights;
          next[activeSheetIndex] = s;
          return next;
        });
      }
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      setResizingRow(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, resizingRow, activeSheetIndex]);

  // Global mouseup listener for drag-selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting]);

  // Prevent native text dragging/selection during cell range marquee selection
  useEffect(() => {
    if (!isSelecting) return;
    const preventSelect = (e: Event) => e.preventDefault();
    document.addEventListener('selectstart', preventSelect);
    return () => document.removeEventListener('selectstart', preventSelect);
  }, [isSelecting]);

  // Compute total columns and column headers
  const colCount = Math.max(currentSheet?.maxCols || 8, currentSheet?.rows[0]?.length || 8);
  const colHeaders = Array.from({ length: colCount }, (_, i) => String.fromCharCode(65 + i));

  // Normalized rectangular range
  const normalizedRange = useMemo(() => {
    if (selectedColIndex !== null && currentSheet) {
      return {
        minRow: 0,
        maxRow: Math.max(0, currentSheet.rows.length - 1),
        minCol: selectedColIndex,
        maxCol: selectedColIndex,
      };
    }
    if (selectedRowIndex !== null && currentSheet) {
      return {
        minRow: selectedRowIndex,
        maxRow: selectedRowIndex,
        minCol: 0,
        maxCol: colCount - 1,
      };
    }
    if (selectedRange) {
      return {
        minRow: Math.min(selectedRange.startRow, selectedRange.endRow),
        maxRow: Math.max(selectedRange.startRow, selectedRange.endRow),
        minCol: Math.min(selectedRange.startCol, selectedRange.endCol),
        maxCol: Math.max(selectedRange.startCol, selectedRange.endCol),
      };
    }
    if (selectedCell) {
      return {
        minRow: selectedCell.row,
        maxRow: selectedCell.row,
        minCol: selectedCell.col,
        maxCol: selectedCell.col,
      };
    }
    return null;
  }, [currentSheet, colCount, selectedCell, selectedColIndex, selectedRange, selectedRowIndex]);

  const isCellInRange = useCallback(
    (r: number, c: number) => {
      if (!normalizedRange) return false;
      return (
        r >= normalizedRange.minRow &&
        r <= normalizedRange.maxRow &&
        c >= normalizedRange.minCol &&
        c <= normalizedRange.maxCol
      );
    },
    [normalizedRange],
  );

  const isAnchorCell = useCallback(
    (r: number, c: number) => {
      if (anchorCell) {
        return anchorCell.row === r && anchorCell.col === c;
      }
      if (selectedCell) {
        return selectedCell.row === r && selectedCell.col === c;
      }
      return false;
    },
    [anchorCell, selectedCell],
  );

  const getCellKey = (r: number, c: number) => `${r},${c}`;

  const getCellStyle = useCallback(
    (row: number, col: number): CellStyle => {
      const key = getCellKey(row, col);
      const cellStyle = currentSheet?.cellStyles?.[key];
      const colStyle = currentSheet?.colStyles?.[col];
      return { ...colStyle, ...cellStyle };
    },
    [currentSheet],
  );

  const updateCell = useCallback(
    (row: number, col: number, value: string) => {
      setSheets((prev) => {
        const next = [...prev];
        const s = { ...next[activeSheetIndex] };
        const rows = s.rows.map((r) => [...r]);

        while (rows.length <= row) {
          rows.push(new Array(s.maxCols).fill(''));
        }
        while (rows[row].length <= col) {
          rows[row].push('');
        }

        rows[row][col] = value;
        s.rows = rows;
        next[activeSheetIndex] = s;
        return next;
      });
    },
    [activeSheetIndex],
  );

  const updateCellStyle = useCallback(
    (row: number, col: number, patch: Partial<CellStyle>) => {
      setSheets((prev) => {
        const next = [...prev];
        const s = { ...next[activeSheetIndex] };
        const cellStyles = { ...(s.cellStyles || {}) };
        const key = getCellKey(row, col);
        cellStyles[key] = { ...(cellStyles[key] || {}), ...patch };
        s.cellStyles = cellStyles;
        next[activeSheetIndex] = s;
        return next;
      });
    },
    [activeSheetIndex],
  );

  const updateColumnStyle = useCallback(
    (col: number, patch: Partial<CellStyle>) => {
      setSheets((prev) => {
        const next = [...prev];
        const s = { ...next[activeSheetIndex] };
        const cellStyles = { ...(s.cellStyles || {}) };
        for (let r = 0; r < s.rows.length; r++) {
          const key = getCellKey(r, col);
          cellStyles[key] = { ...(cellStyles[key] || {}), ...patch };
        }
        s.cellStyles = cellStyles;
        next[activeSheetIndex] = s;
        return next;
      });
    },
    [activeSheetIndex],
  );

  const updateRowStyle = useCallback(
    (row: number, patch: Partial<CellStyle>) => {
      setSheets((prev) => {
        const next = [...prev];
        const s = { ...next[activeSheetIndex] };
        const cellStyles = { ...(s.cellStyles || {}) };
        const totalCols = Math.max(s.maxCols || 8, s.rows[0]?.length || 8);
        for (let c = 0; c < totalCols; c++) {
          const key = getCellKey(row, c);
          cellStyles[key] = { ...(cellStyles[key] || {}), ...patch };
        }
        s.cellStyles = cellStyles;
        next[activeSheetIndex] = s;
        return next;
      });
    },
    [activeSheetIndex],
  );

  // Apply formatting to ALL selected cells in the range simultaneously
  const handleApplyFormatting = useCallback(
    (patch: Partial<CellStyle>) => {
      if (normalizedRange) {
        setSheets((prev) => {
          const next = [...prev];
          const s = { ...next[activeSheetIndex] };
          const cellStyles = { ...(s.cellStyles || {}) };
          for (let r = normalizedRange.minRow; r <= normalizedRange.maxRow; r++) {
            for (let c = normalizedRange.minCol; c <= normalizedRange.maxCol; c++) {
              const key = getCellKey(r, c);
              cellStyles[key] = { ...(cellStyles[key] || {}), ...patch };
            }
          }
          s.cellStyles = cellStyles;
          next[activeSheetIndex] = s;
          return next;
        });
      } else if (selectedColIndex !== null) {
        updateColumnStyle(selectedColIndex, patch);
      } else if (selectedRowIndex !== null) {
        updateRowStyle(selectedRowIndex, patch);
      } else if (selectedCell) {
        updateCellStyle(selectedCell.row, selectedCell.col, patch);
      }
    },
    [
      activeSheetIndex,
      normalizedRange,
      selectedCell,
      selectedColIndex,
      selectedRowIndex,
      updateCellStyle,
      updateColumnStyle,
      updateRowStyle,
    ],
  );

  // Clear values of all cells in selected range
  const handleClearSelectedRange = useCallback(() => {
    if (normalizedRange) {
      setSheets((prev) => {
        const next = [...prev];
        const s = { ...next[activeSheetIndex] };
        const rows = s.rows.map((r) => [...r]);
        for (let r = normalizedRange.minRow; r <= normalizedRange.maxRow; r++) {
          if (rows[r]) {
            for (let c = normalizedRange.minCol; c <= normalizedRange.maxCol; c++) {
              rows[r][c] = '';
            }
          }
        }
        s.rows = rows;
        next[activeSheetIndex] = s;
        return next;
      });
    }
  }, [activeSheetIndex, normalizedRange]);

  const handleCommitEdit = () => {
    if (editingCell) {
      updateCell(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
    }
  };

  // Cell mouse down -> start marquee drag selection
  const handleCellMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (e.button !== 0) return; // Only primary mouse button

    if (editingCell) {
      handleCommitEdit();
    }

    if (e.shiftKey && anchorCell) {
      setSelectedRange({
        startRow: anchorCell.row,
        startCol: anchorCell.col,
        endRow: row,
        endCol: col,
      });
      setSelectedCell({ row, col });
    } else {
      setAnchorCell({ row, col });
      setSelectedRange({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      });
      setSelectedCell({ row, col });
      setSelectedColIndex(null);
      setSelectedRowIndex(null);
      setIsSelecting(true);
    }
  };

  // Cell mouse enter -> expand marquee drag selection
  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting && anchorCell) {
      setSelectedRange({
        startRow: anchorCell.row,
        startCol: anchorCell.col,
        endRow: row,
        endCol: col,
      });
      setSelectedCell({ row, col });
    }
  };

  // Determine active style for toolbar toggles
  const activeStyle: CellStyle = useMemo(() => {
    const target = anchorCell || selectedCell;
    if (target) {
      return getCellStyle(target.row, target.col);
    }
    if (selectedColIndex !== null) {
      return currentSheet?.colStyles?.[selectedColIndex] || {};
    }
    if (selectedRowIndex !== null) {
      return getCellStyle(selectedRowIndex, 0);
    }
    return {};
  }, [anchorCell, currentSheet, getCellStyle, selectedCell, selectedColIndex, selectedRowIndex]);

  // Keyboard shortcut listener (Delete/Backspace to clear range, Ctrl+B, Ctrl+I)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCell || (e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (normalizedRange) {
          e.preventDefault();
          handleClearSelectedRange();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleApplyFormatting({ bold: !activeStyle.bold });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleApplyFormatting({ italic: !activeStyle.italic });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStyle, editingCell, handleApplyFormatting, handleClearSelectedRange, normalizedRange]);

  // Add / Delete rows and columns
  const handleAddRow = (atIndex?: number) => {
    setSheets((prev) => {
      const next = [...prev];
      const s = { ...next[activeSheetIndex] };
      const rows = s.rows.map((r) => [...r]);
      const newRow = new Array(s.maxCols).fill('');
      const target = atIndex !== undefined ? atIndex : rows.length;
      rows.splice(target, 0, newRow);
      s.rows = rows;
      next[activeSheetIndex] = s;
      return next;
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    setSheets((prev) => {
      const next = [...prev];
      const s = { ...next[activeSheetIndex] };
      if (s.rows.length <= 1) return prev;
      s.rows = s.rows.filter((_, idx) => idx !== rowIndex);
      next[activeSheetIndex] = s;
      return next;
    });
    setSelectedCell(null);
    setSelectedRange(null);
    setAnchorCell(null);
    setSelectedRowIndex(null);
    setEditingCell(null);
  };

  const handleAddColumn = (atIndex?: number) => {
    setSheets((prev) => {
      const next = [...prev];
      const s = { ...next[activeSheetIndex] };
      s.maxCols = (s.maxCols || 5) + 1;
      const target = atIndex !== undefined ? atIndex : s.maxCols - 1;
      s.rows = s.rows.map((r) => {
        const rowCopy = [...r];
        rowCopy.splice(target, 0, '');
        return rowCopy;
      });

      if (s.colWidths) {
        const widths = [...s.colWidths];
        widths.splice(target, 0, 110);
        s.colWidths = widths;
      }

      next[activeSheetIndex] = s;
      return next;
    });
  };

  const handleDeleteColumn = (colIndex: number) => {
    setSheets((prev) => {
      const next = [...prev];
      const s = { ...next[activeSheetIndex] };
      if (s.maxCols <= 1) return prev;
      s.maxCols = s.maxCols - 1;
      s.rows = s.rows.map((r) => r.filter((_, idx) => idx !== colIndex));

      if (s.colWidths) {
        s.colWidths = s.colWidths.filter((_, idx) => idx !== colIndex);
      }

      next[activeSheetIndex] = s;
      return next;
    });
    setSelectedCell(null);
    setSelectedRange(null);
    setAnchorCell(null);
    setSelectedColIndex(null);
    setEditingCell(null);
  };

  const handleAddSheet = () => {
    const nextSheets = [
      ...sheets,
      {
        name: `Лист ${sheets.length + 1}`,
        rows: [
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
        ],
        maxCols: 5,
        cellStyles: {},
        colWidths: [110, 110, 110, 110, 110],
        rowHeights: [30, 30, 30],
      },
    ];
    setSheets(nextSheets);
    const newIdx = sheets.length;
    setActiveSheetIndex(newIdx);
    setSelectedCell(null);
    setSelectedRange(null);
    setAnchorCell(null);
    setSelectedColIndex(null);
    setSelectedRowIndex(null);
    onTotalPagesChange?.(nextSheets.length);
    onPageChange?.(newIdx + 1);
  };

  // Export & Save
  const handleExport = async (action: 'save' | 'send' | 'download') => {
    setIsSaving(true);
    try {
      const editedFile = await exportSpreadsheetToXlsx(sheets, fileName);
      if (action === 'save' && onSave) {
        onSave(editedFile);
      } else if (action === 'send' && onSendDirectly) {
        onSendDirectly(editedFile);
      } else if (onDownload) {
        onDownload(editedFile);
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(editedFile);
        link.download = editedFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to export edited spreadsheet:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasSelection = Boolean(
    normalizedRange ||
    selectedRange ||
    selectedCell ||
    selectedColIndex !== null ||
    selectedRowIndex !== null,
  );

  // Total table width calculated from row header (48px) + each column width
  const totalTableWidth = useMemo(() => {
    const rowHeaderWidth = 48;
    const colsWidth = colHeaders.reduce((acc, _, idx) => {
      return acc + (currentSheet?.colWidths?.[idx] || 110);
    }, 0);
    return rowHeaderWidth + colsWidth;
  }, [colHeaders, currentSheet?.colWidths]);

  return (
    <div className="flex flex-col h-full bg-[#0d0e15] text-white rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none">
      {/* 1. Top Ribbon Toolbar (Z-Index 50) */}
      <div className="relative z-50 p-2 sm:px-4 bg-[#1a1b26] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 select-none">
        {/* Left: Quick Actions & Formatting */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleAddRow()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow transition-all active:scale-95 cursor-pointer"
            title="Додати новий рядок"
          >
            <Plus size={14} />
            <span>Рядок</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddColumn()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow transition-all active:scale-95 cursor-pointer"
            title="Додати новий стовпець"
          >
            <Plus size={14} />
            <span>Стовпець</span>
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Cell Fill Color Picker (Click-to-toggle) */}
          <div className="relative flex items-center" ref={fillPickerRef}>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={(e) => {
                e.stopPropagation();
                setIsFillPickerOpen((prev) => !prev);
                setIsTextColorPickerOpen(false);
              }}
              className={`p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-gray-200 transition-colors cursor-pointer ${
                isFillPickerOpen ? 'bg-white/20 text-white' : ''
              }`}
              title="Колір заливки ячейки"
            >
              <PaintBucket size={16} style={{ color: activeStyle.bg || undefined }} />
            </button>
            {isFillPickerOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-2 p-2.5 rounded-xl shadow-2xl z-[70] flex flex-col gap-2 min-w-[210px]"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(28, 30, 44, 0.98) 0%, rgba(16, 18, 28, 0.99) 100%)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  boxShadow:
                    '0 20px 40px -8px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
                }}
              >
                <div className="flex items-center justify-between px-1 border-b border-white/10 pb-1.5">
                  <span className="text-[11px] font-medium text-gray-200">
                    Заливка{' '}
                    {selectedColIndex !== null
                      ? '(стовпець)'
                      : selectedRowIndex !== null
                        ? '(рядок)'
                        : normalizedRange &&
                            (normalizedRange.minRow !== normalizedRange.maxRow ||
                              normalizedRange.minCol !== normalizedRange.maxCol)
                          ? '(діапазон)'
                          : '(ячейка)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyFormatting({ bg: '' });
                      setIsFillPickerOpen(false);
                    }}
                    className="text-[11px] text-gray-400 hover:text-rose-400 underline cursor-pointer"
                  >
                    Скинути
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-0.5">
                  {FILL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        handleApplyFormatting({ bg: c });
                        setIsFillPickerOpen(false);
                      }}
                      className="w-7 h-7 rounded-md border border-white/30 hover:scale-110 active:scale-95 transition-transform cursor-pointer shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                {/* Custom Color Input */}
                <div className="flex items-center justify-between pt-1 border-t border-white/10 px-1 text-[11px] text-gray-300">
                  <span>Довільний колір:</span>
                  <input
                    type="color"
                    value={activeStyle.bg || '#ffffff'}
                    onChange={(e) => handleApplyFormatting({ bg: e.target.value })}
                    className="w-7 h-6 rounded cursor-pointer border border-white/20 bg-transparent"
                    title="Вибрати довільний колір заливки"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cell / Column Text Color Picker (Click-to-toggle) */}
          <div className="relative flex items-center" ref={textColorPickerRef}>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={(e) => {
                e.stopPropagation();
                setIsTextColorPickerOpen((prev) => !prev);
                setIsFillPickerOpen(false);
              }}
              className={`p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-gray-200 transition-colors cursor-pointer ${
                isTextColorPickerOpen ? 'bg-white/20 text-white' : ''
              }`}
              title="Колір тексту"
            >
              <Palette size={16} style={{ color: activeStyle.color || undefined }} />
            </button>
            {isTextColorPickerOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-2 p-2.5 rounded-xl shadow-2xl z-[70] flex flex-col gap-2 min-w-[210px]"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(28, 30, 44, 0.98) 0%, rgba(16, 18, 28, 0.99) 100%)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  boxShadow:
                    '0 20px 40px -8px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
                }}
              >
                <div className="flex items-center justify-between px-1 border-b border-white/10 pb-1.5">
                  <span className="text-[11px] font-medium text-gray-200">
                    Колір тексту{' '}
                    {selectedColIndex !== null
                      ? '(стовпець)'
                      : selectedRowIndex !== null
                        ? '(рядок)'
                        : normalizedRange &&
                            (normalizedRange.minRow !== normalizedRange.maxRow ||
                              normalizedRange.minCol !== normalizedRange.maxCol)
                          ? '(діапазон)'
                          : '(ячейка)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyFormatting({ color: '' });
                      setIsTextColorPickerOpen(false);
                    }}
                    className="text-[11px] text-gray-400 hover:text-rose-400 underline cursor-pointer"
                  >
                    Скинути
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-0.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        handleApplyFormatting({ color: c });
                        setIsTextColorPickerOpen(false);
                      }}
                      className="w-7 h-7 rounded-md border border-white/30 hover:scale-110 active:scale-95 transition-transform cursor-pointer shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                {/* Custom Color Input */}
                <div className="flex items-center justify-between pt-1 border-t border-white/10 px-1 text-[11px] text-gray-300">
                  <span>Довільний колір:</span>
                  <input
                    type="color"
                    value={activeStyle.color || '#000000'}
                    onChange={(e) => handleApplyFormatting({ color: e.target.value })}
                    className="w-7 h-6 rounded cursor-pointer border border-white/20 bg-transparent"
                    title="Вибрати довільний колір тексту"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Bold, Italic */}
          <button
            type="button"
            disabled={!hasSelection}
            onClick={() => handleApplyFormatting({ bold: !activeStyle.bold })}
            className={`p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-gray-200 transition-colors cursor-pointer ${
              activeStyle.bold ? 'bg-white/20 text-white font-bold' : ''
            }`}
            title="Жирний (Ctrl+B)"
          >
            <Bold size={15} />
          </button>

          <button
            type="button"
            disabled={!hasSelection}
            onClick={() => handleApplyFormatting({ italic: !activeStyle.italic })}
            className={`p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-gray-200 transition-colors cursor-pointer ${
              activeStyle.italic ? 'bg-white/20 text-white' : ''
            }`}
            title="Курсив (Ctrl+I)"
          >
            <Italic size={15} />
          </button>

          {/* Alignment */}
          <button
            type="button"
            disabled={!hasSelection}
            onClick={() => handleApplyFormatting({ align: 'left' })}
            className={`p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-gray-200 transition-colors cursor-pointer ${
              activeStyle.align === 'left' ? 'bg-white/20 text-white' : ''
            }`}
            title="Вирівнювання ліворуч"
          >
            <AlignLeft size={15} />
          </button>

          <button
            type="button"
            disabled={!hasSelection}
            onClick={() => handleApplyFormatting({ align: 'center' })}
            className={`p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-gray-200 transition-colors cursor-pointer ${
              activeStyle.align === 'center' ? 'bg-white/20 text-white' : ''
            }`}
            title="По центру"
          >
            <AlignCenter size={15} />
          </button>

          <button
            type="button"
            disabled={!hasSelection}
            onClick={() => handleApplyFormatting({ align: 'right' })}
            className={`p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-gray-200 transition-colors cursor-pointer ${
              activeStyle.align === 'right' ? 'bg-white/20 text-white' : ''
            }`}
            title="Вирівнювання праворуч"
          >
            <AlignRight size={15} />
          </button>
        </div>

        {/* Right: Save / Send Action Buttons */}
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleExport('save')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Зберегти оновлений файл"
            >
              <Save size={14} />
              <span>Зберегти</span>
            </button>
          )}

          {onSendDirectly && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleExport('send')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Надіслати змінений файл у чат"
            >
              <Send size={13} />
              <span>Надіслати</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Formula Bar & Search (Z-Index 30) */}
      <div className="relative z-30 px-3 py-1.5 bg-[#141520] border-b border-white/10 flex items-center gap-3 text-xs">
        {/* Cell / Range Coordinate Pill */}
        <div className="min-w-16 px-2.5 py-1 rounded bg-black/40 border border-white/10 text-center font-mono font-bold text-emerald-400 select-none text-[11px] transition-all">
          {selectedColIndex !== null
            ? `${colHeaders[selectedColIndex]}:${colHeaders[selectedColIndex]}`
            : selectedRowIndex !== null
              ? `${selectedRowIndex + 1}:${selectedRowIndex + 1}`
              : isSelecting &&
                  normalizedRange &&
                  (normalizedRange.minRow !== normalizedRange.maxRow ||
                    normalizedRange.minCol !== normalizedRange.maxCol)
                ? `${normalizedRange.maxRow - normalizedRange.minRow + 1}R × ${normalizedRange.maxCol - normalizedRange.minCol + 1}C`
                : normalizedRange
                  ? normalizedRange.minRow === normalizedRange.maxRow &&
                    normalizedRange.minCol === normalizedRange.maxCol
                    ? `${colHeaders[normalizedRange.minCol] || 'A'}${normalizedRange.minRow + 1}`
                    : `${colHeaders[normalizedRange.minCol] || 'A'}${normalizedRange.minRow + 1}:${colHeaders[normalizedRange.maxCol] || 'A'}${normalizedRange.maxRow + 1}`
                  : '--'}
        </div>

        {/* Formula Bar / Active cell input */}
        <div className="flex-1 flex items-center">
          <span className="text-gray-500 font-mono pr-2 select-none">fx</span>
          <input
            type="text"
            disabled={!hasSelection}
            value={
              editingCell
                ? editValue
                : anchorCell && currentSheet?.rows[anchorCell.row]?.[anchorCell.col] !== undefined
                  ? currentSheet.rows[anchorCell.row][anchorCell.col]
                  : selectedCell &&
                      currentSheet?.rows[selectedCell.row]?.[selectedCell.col] !== undefined
                    ? currentSheet.rows[selectedCell.row][selectedCell.col]
                    : ''
            }
            onChange={(e) => {
              const target = anchorCell || selectedCell;
              if (target) {
                updateCell(target.row, target.col, e.target.value);
                setEditValue(e.target.value);
              }
            }}
            placeholder="Введіть значення ячейки..."
            className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none font-sans text-xs"
          />
        </div>

        {/* Quick Filter Search */}
        <div className="relative w-44 shrink-0">
          <Search size={13} className="absolute left-2 top-2 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Пошук у листі..."
            className="w-full pl-7 pr-2 py-1 rounded-md bg-black/30 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 3. Main Excel Grid (Z-Index 10) */}
      <div className="relative z-10 overflow-auto max-h-[66vh] custom-scrollbar bg-white select-none">
        <table
          className="border-collapse table-fixed text-[13px] font-sans text-slate-900 leading-snug"
          style={{
            width: `${totalTableWidth}px`,
            minWidth: '100%',
          }}
        >
          {/* Strictly locked column widths via <colgroup> */}
          <colgroup>
            <col style={{ width: '48px', minWidth: '48px' }} />
            {colHeaders.map((_, cIdx) => {
              const w = currentSheet?.colWidths?.[cIdx] || 110;
              return <col key={cIdx} style={{ width: `${w}px`, minWidth: `${w}px` }} />;
            })}
          </colgroup>

          <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 select-none">
            <tr>
              {/* Top-left corner */}
              <th
                onClick={() => {
                  setSelectedCell(null);
                  setSelectedRange(null);
                  setAnchorCell(null);
                  setSelectedColIndex(null);
                  setSelectedRowIndex(null);
                }}
                className="w-12 h-7 px-1.5 bg-slate-100 border-r border-b border-slate-300 text-center font-semibold text-[11px] text-slate-600 select-none cursor-pointer hover:bg-slate-200 transition-colors"
                title="Зняти виділення"
              >
                #
              </th>
              {colHeaders.map((col, cIdx) => {
                const isColHeaderHighlighted = normalizedRange
                  ? cIdx >= normalizedRange.minCol && cIdx <= normalizedRange.maxCol
                  : false;

                return (
                  <th
                    key={col}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedColIndex(cIdx);
                      setSelectedRowIndex(null);
                      setSelectedCell(null);
                      setSelectedRange({
                        startRow: 0,
                        startCol: cIdx,
                        endRow: (currentSheet?.rows.length || 1) - 1,
                        endCol: cIdx,
                      });
                      setAnchorCell({ row: 0, col: cIdx });
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, type: 'col', index: cIdx });
                    }}
                    className={`relative h-7 px-1 border-r border-b border-slate-300 text-center font-semibold text-xs transition-colors cursor-pointer select-none ${
                      isColHeaderHighlighted
                        ? 'bg-slate-300 text-slate-900 border-b-2 border-b-[#107c41]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title={`Стовпець ${col}. Клікніть, щоб виділити`}
                  >
                    <div className="flex items-center justify-center h-full">
                      <span>{col}</span>
                    </div>

                    {/* Column Resize Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const startWidth = currentSheet?.colWidths?.[cIdx] || 110;
                        setResizingCol({ index: cIdx, startX: e.clientX, startWidth });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-emerald-500/70 z-30 select-none group"
                      title="Потягніть, щоб змінити ширину стовпця"
                    >
                      <div className="w-[1.5px] h-full bg-slate-300 group-hover:bg-emerald-500 mx-auto" />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {currentSheet?.rows.map((row, rIdx) => {
              if (
                searchTerm &&
                !row.some((val) => val.toLowerCase().includes(searchTerm.toLowerCase()))
              ) {
                return null;
              }

              const rowHeight = currentSheet?.rowHeights?.[rIdx];
              const isRowHeaderHighlighted = normalizedRange
                ? rIdx >= normalizedRange.minRow && rIdx <= normalizedRange.maxRow
                : false;

              return (
                <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                  {/* Row Header with Context Menu & Row Resize Handle */}
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRowIndex(rIdx);
                      setSelectedColIndex(null);
                      setSelectedCell(null);
                      setSelectedRange({
                        startRow: rIdx,
                        startCol: 0,
                        endRow: rIdx,
                        endCol: colCount - 1,
                      });
                      setAnchorCell({ row: rIdx, col: 0 });
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, type: 'row', index: rIdx });
                    }}
                    style={{
                      height: rowHeight ? `${rowHeight}px` : undefined,
                    }}
                    className={`relative w-12 px-1 border-r border-b border-slate-300 text-center font-semibold text-[11px] transition-colors cursor-pointer select-none ${
                      isRowHeaderHighlighted
                        ? 'bg-slate-300 text-slate-900 border-r-2 border-r-[#107c41]'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={`Рядок ${rIdx + 1}. Клікніть, щоб виділити`}
                  >
                    <span>{rIdx + 1}</span>

                    {/* Row Resize Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const startHeight = currentSheet?.rowHeights?.[rIdx] || 30;
                        setResizingRow({ index: rIdx, startY: e.clientY, startHeight });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 right-0 bottom-0 h-2.5 cursor-row-resize hover:bg-emerald-500/70 z-30 select-none group"
                      title="Потягніть, щоб змінити висоту рядка"
                    >
                      <div className="h-[1.5px] w-full bg-slate-300 group-hover:bg-emerald-500 my-auto" />
                    </div>
                  </td>

                  {/* Row Cells */}
                  {colHeaders.map((_, cIdx) => {
                    const inRange = isCellInRange(rIdx, cIdx);
                    const isAnchor = isAnchorCell(rIdx, cIdx);
                    const isEditing = editingCell?.row === rIdx && editingCell?.col === cIdx;
                    const style = getCellStyle(rIdx, cIdx);
                    const cellVal = row[cIdx] || '';

                    // Green Excel border detection (2px)
                    const isTopEdge = inRange && rIdx === normalizedRange!.minRow;
                    const isBottomEdge = inRange && rIdx === normalizedRange!.maxRow;
                    const isLeftEdge = inRange && cIdx === normalizedRange!.minCol;
                    const isRightEdge = inRange && cIdx === normalizedRange!.maxCol;

                    // Inset box shadow calculation for seamless 2px green rectangle
                    const shadowParts: string[] = [];
                    if (inRange) {
                      if (isTopEdge) shadowParts.push('inset 0 2px 0 0 #107c41');
                      if (isBottomEdge) shadowParts.push('inset 0 -2px 0 0 #107c41');
                      if (isLeftEdge) shadowParts.push('inset 2px 0 0 0 #107c41');
                      if (isRightEdge) shadowParts.push('inset -2px 0 0 0 #107c41');
                      if (isSelecting) shadowParts.push('inset 0 0 8px rgba(16, 124, 65, 0.15)');
                    }

                    // Background color styling: Anchor keeps base color, other cells in range receive Excel silver/slate selection tint
                    let cellBg: string | undefined = style.bg || undefined;
                    if (inRange) {
                      if (isAnchor) {
                        cellBg = style.bg || '#ffffff';
                      } else {
                        if (style.bg) {
                          cellBg = `linear-gradient(rgba(0, 0, 0, 0.10), rgba(0, 0, 0, 0.10)), ${style.bg}`;
                        } else {
                          cellBg = '#e2e8f0'; // Clean Excel selection silver tint
                        }
                      }
                    }

                    return (
                      <td
                        key={cIdx}
                        onMouseDown={(e) => handleCellMouseDown(e, rIdx, cIdx)}
                        onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                        onDoubleClick={() => {
                          setEditingCell({ row: rIdx, col: cIdx });
                          setEditValue(cellVal);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (!isCellInRange(rIdx, cIdx)) {
                            setSelectedCell({ row: rIdx, col: cIdx });
                            setSelectedRange({
                              startRow: rIdx,
                              startCol: cIdx,
                              endRow: rIdx,
                              endCol: cIdx,
                            });
                            setAnchorCell({ row: rIdx, col: cIdx });
                          }
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            type: 'cell',
                            index: rIdx,
                            colIndex: cIdx,
                          });
                        }}
                        style={{
                          height: rowHeight ? `${rowHeight}px` : undefined,
                          background: cellBg,
                          boxShadow: shadowParts.length > 0 ? shadowParts.join(', ') : undefined,
                          color: style.color || undefined,
                          fontWeight: style.bold ? 'bold' : 'normal',
                          fontStyle: style.italic ? 'italic' : 'normal',
                          textAlign: style.align || 'left',
                          transition: 'background-color 100ms ease, box-shadow 100ms ease',
                        }}
                        className={`relative px-2.5 py-1 border-r border-b border-slate-200 truncate cursor-cell ${
                          inRange ? 'z-10' : ''
                        }`}
                        title={cellVal}
                      >
                        {isEditing ? (
                          <input
                            ref={cellInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCommitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="absolute inset-0 w-full h-full px-2 bg-white text-slate-900 border-2 border-[#107c41] outline-none font-sans text-[13px] z-20"
                          />
                        ) : (
                          <span>{cellVal}</span>
                        )}

                        {/* Fill handle at bottom-right corner of selection */}
                        {isBottomEdge && isRightEdge && (
                          <div
                            className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#107c41] border border-white z-30 cursor-crosshair shadow-xs rounded-[0.5px] transition-transform hover:scale-125"
                            title="Маркер автозаповнення"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. Sheet Tabs Switcher (Bottom) */}
      <div className="p-2 sm:px-3 bg-[#161722] border-t border-white/10 flex items-center justify-between gap-2 select-none rounded-b-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {sheets.map((sheet, sIdx) => (
            <button
              key={sIdx}
              type="button"
              onClick={() => {
                setActiveSheetIndex(sIdx);
                setSelectedCell(null);
                setSelectedRange(null);
                setAnchorCell(null);
                setSelectedColIndex(null);
                setSelectedRowIndex(null);
                setEditingCell(null);
                onPageChange?.(sIdx + 1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeSheetIndex === sIdx
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              {sheet.name}
            </button>
          ))}

          <button
            type="button"
            onClick={handleAddSheet}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
            title="Створити новий лист"
          >
            <Plus size={14} />
            <span>Лист</span>
          </button>
        </div>

        <div className="text-[11px] text-gray-400 font-mono">
          {currentSheet?.rows.length || 0} рядків × {colCount} колонок
        </div>
      </div>

      {/* 5. Custom Context Menu */}
      {contextMenu && (
        <div
          role="menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-48 bg-[#202230] border border-white/15 rounded-xl shadow-2xl p-1.5 flex flex-col text-xs text-white animate-popIn duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'row' && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleAddRow(contextMenu.index);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Вставити рядок вище
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddRow(contextMenu.index + 1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Вставити рядок нижче
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteRow(contextMenu.index);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
              >
                Видалити рядок #{contextMenu.index + 1}
              </button>
            </>
          )}

          {contextMenu.type === 'col' && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleAddColumn(contextMenu.index);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Вставити стовпець ліворуч
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddColumn(contextMenu.index + 1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Вставити стовпець праворуч
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteColumn(contextMenu.index);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
              >
                Видалити стовпець {colHeaders[contextMenu.index]}
              </button>
            </>
          )}

          {contextMenu.type === 'cell' && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (normalizedRange) {
                    handleClearSelectedRange();
                  } else if (contextMenu.colIndex !== undefined) {
                    updateCell(contextMenu.index, contextMenu.colIndex, '');
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Очистити вміст
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApplyFormatting({ bold: !activeStyle.bold });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Зробити жирним (Ctrl+B)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApplyFormatting({ italic: !activeStyle.italic });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Зробити курсивом (Ctrl+I)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddRow(contextMenu.index + 1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Вставити рядок нижче
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteRow(contextMenu.index);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
              >
                Видалити цей рядок
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
