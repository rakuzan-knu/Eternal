import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Save,
  Send,
  Download,
  List,
  Table as TableIcon,
  BarChart2,
  PieChart as PieIcon,
  TrendingUp,
  Monitor,
  Layout,
  Maximize2,
  X,
  Layers,
  Sparkles,
  Eye,
  Check,
  Loader2,
} from 'lucide-react';
import { PresentationSlide } from '../../lib/documentParsers';
import { exportPresentationToPptx } from '../../lib/documentExporters';

export interface EditorSlideState {
  slideNumber: number;
  title: string;
  subtitle?: string;
  paragraphs: string[];
  notes?: string;
  themeBackground?: string;
  slideImageUrl?: string;
  layoutType: 'title' | 'content' | 'chart' | 'table';
  aspectRatio: '16:9' | '4:3';
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  chartData?: {
    title: string;
    type: 'bar' | 'line' | 'pie';
    categories: string[];
    series: { name: string; values: number[] }[];
  };
  images: string[];
  isBulleted?: boolean;
}

interface PresentationEditorProps {
  initialSlides: PresentationSlide[];
  fileName: string;
  originalFile?: File;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (total: number) => void;
  onSave?: (editedFile: File) => void;
  onSendDirectly?: (editedFile: File) => void;
  onDownload?: (editedFile: File) => void;
}

// Canonical Microsoft Office Theme Colors: 10 base colors and 5 tint/shade rows
const OFFICE_THEME_BASE = [
  '#ffffff',
  '#000000',
  '#eeece1',
  '#1f497d',
  '#4f81bd',
  '#c0504d',
  '#9bbb59',
  '#8064a2',
  '#4bacc6',
  '#f79646',
];

const OFFICE_THEME_SHADES = [
  [
    '#f2f2f2',
    '#7f7f7f',
    '#ddd9c3',
    '#c6d9f1',
    '#dce6f2',
    '#f2dcdb',
    '#ebf1dd',
    '#e6e0ec',
    '#dbeef4',
    '#fdeada',
  ],
  [
    '#d9d9d9',
    '#595959',
    '#c4bd97',
    '#8eb4e3',
    '#b9cde5',
    '#e6b9b8',
    '#d7e4bd',
    '#ccc1da',
    '#b7dde8',
    '#fcd5b5',
  ],
  [
    '#bfbfbf',
    '#404040',
    '#948a54',
    '#558ed5',
    '#95b3d7',
    '#d99694',
    '#c3d69b',
    '#b3a1c7',
    '#93cddc',
    '#fac090',
  ],
  [
    '#a6a6a6',
    '#262626',
    '#4a452a',
    '#17375e',
    '#376092',
    '#953735',
    '#77933c',
    '#604a7b',
    '#31859c',
    '#e46c0a',
  ],
  [
    '#7f7f7f',
    '#0d0d0d',
    '#1e1c11',
    '#10243f',
    '#254061',
    '#632523',
    '#4f6228',
    '#403152',
    '#215968',
    '#984807',
  ],
];

const OFFICE_STANDARD_COLORS = [
  '#c00000',
  '#ff0000',
  '#ffc000',
  '#ffff00',
  '#92d050',
  '#00b050',
  '#00b0f0',
  '#0070c0',
  '#002060',
  '#7030a0',
];

function normalizeColorToHex(color: string | number): string {
  if (typeof color === 'number') {
    const hex = color.toString(16).padStart(6, '0');
    return `#${hex}`;
  }
  if (!color) return '#000000';
  const rgbMatch = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  if (String(color).startsWith('#')) return String(color);
  return String(color);
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s = s / 100;
  v = v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

const BUILTIN_THEMES = [
  { id: 'classic', name: 'PowerPoint Classic', banner: '#2563eb', bg: '#f8fafc', text: '#0f172a' },
  { id: 'emerald', name: 'Emerald Sage', banner: '#16a34a', bg: '#f0fdf4', text: '#064e3b' },
  { id: 'navy', name: 'Executive Navy', banner: '#1e293b', bg: '#f8fafc', text: '#0f172a' },
  { id: 'studio', name: 'Studio Dark', banner: '#6366f1', bg: '#0f172a', text: '#f8fafc' },
];

/**
 * Auto-expanding textarea that adjusts its height dynamically
 * and provides responsive font scaling so text never cuts off.
 */
function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className = '',
  style = {},
  autoScale = false,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  autoScale?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 26)}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  let dynamicSizeClass = '';
  if (autoScale) {
    if (value.length > 700) dynamicSizeClass = 'text-xs sm:text-[13px] leading-relaxed';
    else if (value.length > 300) dynamicSizeClass = 'text-sm sm:text-base leading-relaxed';
    else dynamicSizeClass = 'text-base sm:text-lg leading-relaxed';
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      placeholder={placeholder}
      className={`w-full bg-transparent resize-none outline-none overflow-hidden transition-all ${dynamicSizeClass} ${className}`}
      style={{ ...style }}
    />
  );
}

/**
 * Rich contentEditable element for slide text fields (title, subtitle, paragraphs).
 * Supports inline formatting (bold, italic, underline, color, align), native browser selection,
 * auto-expansion without scrollbars, and seamless PowerPoint-style editing.
 */
function SlideEditableText({
  value,
  onChange,
  placeholder,
  className = '',
  style = {},
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      if (ref.current.innerHTML !== (value || '')) {
        ref.current.innerHTML = value || '';
      }
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-slide-editable="true"
      onInput={(e) => {
        onChange(e.currentTarget.innerHTML);
      }}
      onBlur={(e) => {
        onChange(e.currentTarget.innerHTML);
      }}
      data-placeholder={placeholder}
      className={`outline-none min-h-[1.5em] transition-all empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none ${className}`}
      style={style}
    />
  );
}

export default function PresentationEditor({
  initialSlides,
  fileName,
  originalFile,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  onSave,
  onSendDirectly,
  onDownload,
}: PresentationEditorProps) {
  // Determine if default presentation aspect ratio should be 4:3
  const defaultAspectRatio: '16:9' | '4:3' = initialSlides.some(
    (s) => s.aspectRatio === '4:3' || s.themeBackground,
  )
    ? '4:3'
    : '16:9';

  const [slides, setSlides] = useState<EditorSlideState[]>(() => {
    if (!initialSlides || initialSlides.length === 0) {
      return [
        {
          slideNumber: 1,
          title: 'Нова презентація',
          subtitle: 'Додайте підзаголовок',
          paragraphs: [],
          layoutType: 'title',
          aspectRatio: defaultAspectRatio,
          images: [],
          notes: '',
        },
      ];
    }

    return initialSlides.map((s, idx) => {
      const isTable = s.layoutType === 'table' || !!s.tableData;
      const isChart = s.layoutType === 'chart' || !!s.chartData;
      const isTitle = s.layoutType === 'title' || (!isTable && !isChart && idx === 0);

      const layoutType: 'title' | 'content' | 'chart' | 'table' = isTable
        ? 'table'
        : isChart
          ? 'chart'
          : isTitle
            ? 'title'
            : 'content';

      return {
        slideNumber: s.slideNumber || idx + 1,
        title: s.title || (isTitle ? 'Lorem ipsum' : `Слайд ${idx + 1}`),
        subtitle: s.subtitle,
        paragraphs: s.paragraphs ? [...s.paragraphs] : [],
        themeBackground: s.themeBackground,
        slideImageUrl: s.slideImageUrl,
        layoutType,
        aspectRatio: s.aspectRatio || defaultAspectRatio,
        tableData: s.tableData
          ? {
              headers: [...s.tableData.headers],
              rows: s.tableData.rows.map((r) => [...r]),
            }
          : isTable
            ? {
                headers: ['Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5'],
                rows: Array.from({ length: 5 }, () => Array(5).fill('')),
              }
            : undefined,
        chartData: s.chartData
          ? { ...s.chartData }
          : isChart
            ? {
                title: s.title || 'Графік показників',
                type: 'bar',
                categories: ['Q1', 'Q2', 'Q3', 'Q4'],
                series: [
                  { name: 'Серія 1', values: [45, 78, 62, 90] },
                  { name: 'Серія 2', values: [28, 55, 43, 71] },
                ],
              }
            : undefined,
        images: s.images ? [...s.images] : [],
        isBulleted: layoutType === 'content',
        notes: s.notes || '',
      };
    });
  });

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const currentSlide = slides[activeSlideIndex] || slides[0];

  const [globalAspectRatio, setGlobalAspectRatio] = useState<'16:9' | '4:3'>(defaultAspectRatio);
  const [selectedTheme, setSelectedTheme] = useState<string>('classic');
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');

  // Text formatting
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');

  // Dropdown states
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isCustomColorModalOpen, setIsCustomColorModalOpen] = useState(false);
  const [customHex, setCustomHex] = useState('000000');
  const [customRgb, setCustomRgb] = useState<[number, number, number]>([0, 0, 0]);
  const [customHue, setCustomHue] = useState(0);
  const [customSat, setCustomSat] = useState(100);
  const [customVal, setCustomVal] = useState(0);

  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isChartEditOpen, setIsChartEditOpen] = useState(false);

  // Fullscreen Slide Show state
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isModified, setIsModified] = useState(false);

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Selection & Active Formatting Tracking (Like Microsoft Office)
  const savedRangeRef = useRef<Range | null>(null);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = (
        container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement
      ) as HTMLElement | null;
      if (el?.closest('[data-slide-editable]')) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  }, []);

  const updateSelectionFormatting = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    if (!node) return;
    const el = (
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
    ) as HTMLElement | null;
    if (!el?.closest('[data-slide-editable]')) return;

    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));

    if (document.queryCommandState('justifyCenter')) {
      setAlign('center');
    } else if (document.queryCommandState('justifyRight')) {
      setAlign('right');
    } else {
      setAlign('left');
    }

    const rawColor = document.queryCommandValue('foreColor');
    if (rawColor) {
      setTextColor(normalizeColorToHex(rawColor));
    }
  }, []);

  useEffect(() => {
    const handleSelection = () => {
      saveSelection();
      updateSelectionFormatting();
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [saveSelection, updateSelectionFormatting]);

  const handleFormat = useCallback(
    (command: 'bold' | 'italic' | 'underline') => {
      restoreSelection();
      document.execCommand(command, false);
      updateSelectionFormatting();

      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const node = sel.anchorNode;
        const el = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement | null;
        const editable = el?.closest('[data-slide-editable]') as HTMLElement | null;
        if (editable) {
          editable.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      setIsModified(true);
    },
    [restoreSelection, updateSelectionFormatting],
  );

  const handleAlign = useCallback(
    (alignment: 'left' | 'center' | 'right') => {
      restoreSelection();
      const cmd =
        alignment === 'center'
          ? 'justifyCenter'
          : alignment === 'right'
            ? 'justifyRight'
            : 'justifyLeft';
      document.execCommand(cmd, false);
      setAlign(alignment);

      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const node = sel.anchorNode;
        const el = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement | null;
        const editable = el?.closest('[data-slide-editable]') as HTMLElement | null;
        if (editable) {
          editable.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      setIsModified(true);
    },
    [restoreSelection],
  );

  const handleApplyColor = useCallback(
    (color: string) => {
      restoreSelection();
      document.execCommand('foreColor', false, color);
      setTextColor(color);
      setIsColorPickerOpen(false);
      setIsCustomColorModalOpen(false);

      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const node = sel.anchorNode;
        const el = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement | null;
        const editable = el?.closest('[data-slide-editable]') as HTMLElement | null;
        if (editable) {
          editable.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      setIsModified(true);
    },
    [restoreSelection],
  );

  // Synchronize active slide when parent changes currentPage
  useEffect(() => {
    if (currentPage && currentPage >= 1 && currentPage <= slides.length) {
      if (activeSlideIndex !== currentPage - 1) {
        setActiveSlideIndex(currentPage - 1);
      }
    }
  }, [currentPage, slides.length]);

  // Synchronize total pages on mount or change
  useEffect(() => {
    onTotalPagesChange?.(slides.length);
  }, [slides.length, onTotalPagesChange]);

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setIsColorPickerOpen(false);
      }
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(target)) {
        setIsLayoutMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(target)) {
        setIsThemeMenuOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Keyboard navigation for Slide Show Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPresentationMode) {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setActiveSlideIndex((prev) => {
            const next = Math.min(slides.length - 1, prev + 1);
            onPageChange?.(next + 1);
            return next;
          });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setActiveSlideIndex((prev) => {
            const next = Math.max(0, prev - 1);
            onPageChange?.(next + 1);
            return next;
          });
        } else if (e.key === 'Escape') {
          setIsPresentationMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, slides.length, onPageChange]);

  // Slide mutators
  const handleUpdateTitle = (title: string) => {
    setSlides((prev) => {
      const next = [...prev];
      next[activeSlideIndex] = { ...next[activeSlideIndex], title };
      return next;
    });
  };

  const handleUpdateSubtitle = (subtitle: string) => {
    setSlides((prev) => {
      const next = [...prev];
      next[activeSlideIndex] = { ...next[activeSlideIndex], subtitle };
      return next;
    });
  };

  const handleUpdateParagraph = (pIndex: number, text: string) => {
    setSlides((prev) => {
      const next = [...prev];
      const paras = [...next[activeSlideIndex].paragraphs];
      paras[pIndex] = text;
      next[activeSlideIndex] = { ...next[activeSlideIndex], paragraphs: paras };
      return next;
    });
  };

  const handleAddParagraph = () => {
    setSlides((prev) => {
      const next = [...prev];
      const paras = [...next[activeSlideIndex].paragraphs, 'Новий пункт'];
      next[activeSlideIndex] = { ...next[activeSlideIndex], paragraphs: paras };
      return next;
    });
  };

  const handleDeleteParagraph = (pIndex: number) => {
    setSlides((prev) => {
      const next = [...prev];
      const paras = next[activeSlideIndex].paragraphs.filter((_, idx) => idx !== pIndex);
      next[activeSlideIndex] = {
        ...next[activeSlideIndex],
        paragraphs: paras.length > 0 ? paras : [''],
      };
      return next;
    });
  };

  const handleToggleBullets = () => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[activeSlideIndex];
      next[activeSlideIndex] = { ...cur, isBulleted: !cur.isBulleted };
      return next;
    });
  };

  const handleChangeLayout = (layout: 'title' | 'content' | 'chart' | 'table') => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[activeSlideIndex];

      let tableData = cur.tableData;
      if (layout === 'table' && !tableData) {
        tableData = {
          headers: ['Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5'],
          rows: Array.from({ length: 5 }, () => Array(5).fill('')),
        };
      }

      let chartData = cur.chartData;
      if (layout === 'chart' && !chartData) {
        chartData = {
          title: cur.title || 'Графік',
          type: 'bar',
          categories: ['Q1', 'Q2', 'Q3', 'Q4'],
          series: [
            { name: 'Серія 1', values: [45, 78, 62, 90] },
            { name: 'Серія 2', values: [28, 55, 43, 71] },
          ],
        };
      }

      next[activeSlideIndex] = {
        ...cur,
        layoutType: layout,
        tableData,
        chartData,
        isBulleted: layout === 'content',
      };
      return next;
    });
    setIsLayoutMenuOpen(false);
  };

  // Table cell mutators
  const handleUpdateTableHeader = (colIdx: number, val: string) => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[activeSlideIndex];
      if (!cur.tableData) return prev;
      const headers = [...cur.tableData.headers];
      headers[colIdx] = val;
      next[activeSlideIndex] = {
        ...cur,
        tableData: { ...cur.tableData, headers },
      };
      return next;
    });
  };

  const handleUpdateTableCell = (rowIdx: number, colIdx: number, val: string) => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[activeSlideIndex];
      if (!cur.tableData) return prev;
      const rows = cur.tableData.rows.map((r, rI) => {
        if (rI !== rowIdx) return [...r];
        const nextR = [...r];
        nextR[colIdx] = val;
        return nextR;
      });
      next[activeSlideIndex] = {
        ...cur,
        tableData: { ...cur.tableData, rows },
      };
      return next;
    });
  };

  const handleAddTableRow = () => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[activeSlideIndex];
      if (!cur.tableData) return prev;
      const cols = cur.tableData.headers.length;
      const newRow = Array(cols).fill('Нові дані');
      newRow[0] = String(cur.tableData.rows.length + 1);
      next[activeSlideIndex] = {
        ...cur,
        tableData: {
          ...cur.tableData,
          rows: [...cur.tableData.rows, newRow],
        },
      };
      return next;
    });
  };

  const handleAddTableCol = () => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[activeSlideIndex];
      if (!cur.tableData) return prev;
      const newHeader = `Column ${cur.tableData.headers.length + 1}`;
      const headers = [...cur.tableData.headers, newHeader];
      const rows = cur.tableData.rows.map((r) => [...r, '-']);
      next[activeSlideIndex] = {
        ...cur,
        tableData: { headers, rows },
      };
      return next;
    });
  };

  const handleDeleteTableRow = (rowIdx: number) => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[activeSlideIndex];
      if (!cur.tableData || cur.tableData.rows.length <= 1) return prev;
      const rows = cur.tableData.rows.filter((_, idx) => idx !== rowIdx);
      next[activeSlideIndex] = {
        ...cur,
        tableData: { ...cur.tableData, rows },
      };
      return next;
    });
  };

  // Chart mutators
  const handleUpdateChartType = (type: 'bar' | 'line' | 'pie') => {
    setSlides((prev) => {
      const next = [...prev];
      const cur = next[activeSlideIndex];
      if (!cur.chartData) return prev;
      next[activeSlideIndex] = {
        ...cur,
        chartData: { ...cur.chartData, type },
      };
      return next;
    });
  };

  // Slide management
  const handleAddSlide = () => {
    const newSlide: EditorSlideState = {
      slideNumber: slides.length + 1,
      title: `Слайд ${slides.length + 1}`,
      paragraphs: ['Введіть текст слайда...'],
      themeBackground: currentSlide?.themeBackground,
      layoutType: 'content',
      aspectRatio: globalAspectRatio,
      images: [],
      isBulleted: true,
      notes: '',
    };
    const nextSlides = [...slides, newSlide];
    setSlides(nextSlides);
    const newIdx = slides.length;
    setActiveSlideIndex(newIdx);
    onTotalPagesChange?.(nextSlides.length);
    onPageChange?.(newIdx + 1);
  };

  const handleDuplicateSlide = () => {
    const next = [...slides];
    const current = next[activeSlideIndex];
    const duplicated: EditorSlideState = {
      ...current,
      slideNumber: next.length + 1,
      title: `${current.title} (Копія)`,
      paragraphs: [...current.paragraphs],
      tableData: current.tableData
        ? {
            headers: [...current.tableData.headers],
            rows: current.tableData.rows.map((r) => [...r]),
          }
        : undefined,
      chartData: current.chartData ? { ...current.chartData } : undefined,
    };
    next.splice(activeSlideIndex + 1, 0, duplicated);
    setSlides(next);
    const newIdx = activeSlideIndex + 1;
    setActiveSlideIndex(newIdx);
    onTotalPagesChange?.(next.length);
    onPageChange?.(newIdx + 1);
  };

  const handleDeleteSlide = () => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, idx) => idx !== activeSlideIndex);
    setSlides(next);
    const newIdx = Math.max(0, activeSlideIndex - 1);
    setActiveSlideIndex(newIdx);
    onTotalPagesChange?.(next.length);
    onPageChange?.(newIdx + 1);
  };

  // Export
  const handleExport = async (action: 'save' | 'send' | 'download') => {
    setIsSaving(true);
    try {
      let fileToUse: File;
      if (!isModified && originalFile) {
        fileToUse = originalFile;
      } else {
        const presentationSlides = slides.map((s, idx) => ({
          slideNumber: idx + 1,
          title: s.title,
          subtitle: s.subtitle,
          paragraphs: s.paragraphs,
          images: s.images,
          themeBackground: s.themeBackground,
          layoutType: s.layoutType,
          aspectRatio: s.aspectRatio,
          tableData: s.tableData,
          chartData: s.chartData,
          notes: s.notes,
          aspectRatioChoice: globalAspectRatio,
          themeColor: activeThemeObj.banner,
        }));

        fileToUse = await exportPresentationToPptx(
          presentationSlides.map((s) => ({
            ...s,
            aspectRatio: globalAspectRatio,
            themeColor: activeThemeObj.banner,
          })),
          fileName,
        );
      }

      if (action === 'save' && onSave) {
        onSave(fileToUse);
        setIsSavedRecently(true);
        setTimeout(() => setIsSavedRecently(false), 2500);
      } else if (action === 'send' && onSendDirectly) {
        onSendDirectly(fileToUse);
      } else if (onDownload) {
        onDownload(fileToUse);
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(fileToUse);
        link.download = fileToUse.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to export presentation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Active theme styling
  const activeThemeObj = BUILTIN_THEMES.find((t) => t.id === selectedTheme) || BUILTIN_THEMES[0];

  return (
    <div className="w-full max-w-5xl flex flex-col bg-[#1c1d29] border border-white/10 rounded-2xl shadow-2xl my-2 relative">
      {/* 1. PowerPoint Top Ribbon Toolbar (Liquid Glass Style) */}
      <div
        className="relative z-30 p-2 sm:px-4 border-b border-white/15 flex flex-wrap items-center justify-between gap-2 select-none presentation-editor-toolbar"
        style={{
          background:
            'linear-gradient(135deg, rgba(24, 26, 38, 0.78) 0%, rgba(14, 16, 26, 0.86) 100%)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        {/* Left: Slide Operations */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleAddSlide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Створити новий слайд"
          >
            <Plus size={14} />
            <span>Створити слайд</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicateSlide}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 text-xs font-medium transition-all cursor-pointer"
            title="Дублювати активний слайд"
          >
            <Copy size={13} />
            <span>Дублювати</span>
          </button>

          <button
            type="button"
            disabled={slides.length <= 1}
            onClick={handleDeleteSlide}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 disabled:opacity-40 transition-colors cursor-pointer"
            title="Видалити слайд"
          >
            <Trash2 size={15} />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Mode Switcher: 1:1 PowerPoint vs Interactive Editing */}
          {currentSlide?.slideImageUrl && (
            <>
              <div className="flex items-center bg-white/10 p-0.5 rounded-lg border border-white/15">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  title="1:1 Відображення точно як у PowerPoint"
                >
                  <Eye size={13} />
                  <span>1:1 Оригінал</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'edit'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  title="Режим редагування контенту"
                >
                  <Sparkles size={13} />
                  <span>Редагування</span>
                </button>
              </div>
              <div className="w-px h-5 bg-white/15 mx-1" />
            </>
          )}

          {/* Layout Selector Dropdown */}
          <div className="relative" ref={layoutMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLayoutMenuOpen((prev) => !prev);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 text-xs font-medium transition-all cursor-pointer"
              title="Змінити макет слайда"
            >
              <Layout size={14} className="text-orange-400" />
              <span className="capitalize">
                {currentSlide.layoutType === 'title'
                  ? 'Титульний'
                  : currentSlide.layoutType === 'table'
                    ? 'Таблиця'
                    : currentSlide.layoutType === 'chart'
                      ? 'Діаграма'
                      : 'Вміст'}
              </span>
            </button>
            {isLayoutMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-2 p-1.5 rounded-xl shadow-2xl z-50 flex flex-col gap-1 min-w-[170px] bg-[#1a1c29] border border-white/15 backdrop-blur-2xl"
              >
                <button
                  type="button"
                  onClick={() => handleChangeLayout('title')}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    currentSlide.layoutType === 'title'
                      ? 'bg-orange-500/20 text-orange-300 font-bold'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Титульний слайд</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeLayout('content')}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    currentSlide.layoutType === 'content'
                      ? 'bg-orange-500/20 text-orange-300 font-bold'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <List size={14} />
                  <span>Заголовок і список</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeLayout('table')}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    currentSlide.layoutType === 'table'
                      ? 'bg-orange-500/20 text-orange-300 font-bold'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <TableIcon size={14} />
                  <span>Таблиця</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeLayout('chart')}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    currentSlide.layoutType === 'chart'
                      ? 'bg-orange-500/20 text-orange-300 font-bold'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <BarChart2 size={14} />
                  <span>Діаграма</span>
                </button>
              </div>
            )}
          </div>

          {/* Aspect Ratio Switcher (16:9 / 4:3) */}
          <button
            type="button"
            onClick={() => setGlobalAspectRatio((prev) => (prev === '16:9' ? '4:3' : '16:9'))}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 text-xs font-semibold transition-all cursor-pointer"
            title="Перемкнути співвідношення сторін слайдів"
          >
            <span>{globalAspectRatio}</span>
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Text Styling (Synced with selection like Microsoft Office) */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => handleFormat('bold')}
            className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer ${
              isBold ? 'bg-white/20 text-white font-bold ring-1 ring-white/30' : ''
            }`}
            title="Жирний (Ctrl+B)"
          >
            <Bold size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => handleFormat('italic')}
            className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer ${
              isItalic ? 'bg-white/20 text-white ring-1 ring-white/30' : ''
            }`}
            title="Курсив (Ctrl+I)"
          >
            <Italic size={15} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => handleFormat('underline')}
            className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer ${
              isUnderline ? 'bg-white/20 text-white ring-1 ring-white/30' : ''
            }`}
            title="Підкреслений (Ctrl+U)"
          >
            <Underline size={15} />
          </button>

          {/* Bullet List Toggle */}
          {currentSlide.layoutType === 'content' && (
            <button
              type="button"
              onClick={handleToggleBullets}
              className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer ${
                currentSlide.isBulleted ? 'bg-orange-500/20 text-orange-400' : ''
              }`}
              title="Маркований список"
            >
              <List size={15} />
            </button>
          )}

          {/* Text Color Picker (Matching Microsoft Office - Screenshot 2) */}
          <div className="relative flex items-center" ref={colorPickerRef}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={(e) => {
                e.stopPropagation();
                saveSelection();
                setIsColorPickerOpen((prev) => !prev);
              }}
              className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                isColorPickerOpen ? 'bg-white/20 text-white' : ''
              }`}
              title="Колір шрифту"
            >
              <Palette size={15} />
              <div
                className="w-4 h-1 rounded-full border border-black/40"
                style={{ backgroundColor: textColor }}
              />
            </button>
            {isColorPickerOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-2 p-3 rounded-2xl shadow-2xl z-50 flex flex-col gap-2 min-w-[250px] bg-[#1a1c29]/95 border border-white/20 backdrop-blur-2xl select-none"
              >
                {/* Header */}
                <div className="text-xs font-semibold text-gray-200 px-1">Колір шрифту</div>

                {/* Auto Color Button */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleApplyColor('#000000')}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 text-xs text-gray-200 transition-colors cursor-pointer w-full text-left"
                >
                  <span className="w-4 h-4 rounded-xs bg-black border border-white/40 shrink-0" />
                  <span>Авто</span>
                </button>

                {/* Theme Colors Palette */}
                <div className="border-t border-white/10 pt-1.5">
                  <div className="text-[10px] text-gray-400 font-medium mb-1.5 px-1">
                    Лише висока контрастність
                  </div>
                  {/* Base Colors */}
                  <div className="grid grid-cols-10 gap-1 mb-1">
                    {OFFICE_THEME_BASE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyColor(c)}
                        className="w-5 h-4.5 rounded-xs border border-black/30 hover:scale-125 transition-transform cursor-pointer"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  {/* Tints & Shades */}
                  <div className="grid grid-cols-10 gap-1">
                    {OFFICE_THEME_SHADES.map((row, rIdx) =>
                      row.map((c, cIdx) => (
                        <button
                          key={`${rIdx}-${cIdx}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleApplyColor(c)}
                          className="w-5 h-3.5 rounded-xs border border-black/20 hover:scale-125 transition-transform cursor-pointer"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      )),
                    )}
                  </div>
                </div>

                {/* Standard Colors */}
                <div className="border-t border-white/10 pt-1.5">
                  <div className="text-[10px] text-gray-400 font-medium mb-1 px-1">
                    Стандартні кольори
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {OFFICE_STANDARD_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyColor(c)}
                        className="w-5 h-4.5 rounded-xs border border-black/30 hover:scale-125 transition-transform cursor-pointer"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* More Colors Button -> Opens Screenshot 3 Modal */}
                <div className="border-t border-white/10 pt-1">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setIsColorPickerOpen(false);
                      setIsCustomColorModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 text-xs text-gray-200 w-full transition-colors cursor-pointer text-left"
                  >
                    <Palette size={14} className="text-purple-400 shrink-0" />
                    <span>Інші кольори...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Text Alignment (Synced with selection like Microsoft Office) */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => handleAlign('left')}
            className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer ${
              align === 'left' ? 'bg-white/20 text-white font-bold ring-1 ring-white/30' : ''
            }`}
            title="Вирівняти за лівим краєм"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => handleAlign('center')}
            className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer ${
              align === 'center' ? 'bg-white/20 text-white font-bold ring-1 ring-white/30' : ''
            }`}
            title="По центру"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => handleAlign('right')}
            className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer ${
              align === 'right' ? 'bg-white/20 text-white font-bold ring-1 ring-white/30' : ''
            }`}
            title="Вирівняти за правим краєм"
          >
            <AlignRight size={15} />
          </button>

          {/* Add Paragraph button for content / title */}
          {currentSlide.layoutType !== 'table' && currentSlide.layoutType !== 'chart' && (
            <button
              type="button"
              onClick={handleAddParagraph}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 text-xs font-medium transition-all cursor-pointer ml-1"
              title="Додати текстовий пункт"
            >
              <Plus size={13} />
              <span>Пункт</span>
            </button>
          )}

          {/* Table actions if active slide is table */}
          {currentSlide.layoutType === 'table' && (
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={handleAddTableRow}
                className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-medium cursor-pointer"
                title="Додати рядок таблиці"
              >
                <Plus size={12} />
                <span>+ Рядок</span>
              </button>
              <button
                type="button"
                onClick={handleAddTableCol}
                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-medium cursor-pointer"
                title="Додати стовпчик таблиці"
              >
                <Plus size={12} />
                <span>+ Стовпчик</span>
              </button>
            </div>
          )}

          {/* Chart type switchers if active slide is chart */}
          {currentSlide.layoutType === 'chart' && (
            <div className="flex items-center gap-1 ml-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => handleUpdateChartType('bar')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  currentSlide.chartData?.type === 'bar'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="Стовпчаста діаграма"
              >
                <BarChart2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleUpdateChartType('line')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  currentSlide.chartData?.type === 'line'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="Лінійна діаграма"
              >
                <TrendingUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleUpdateChartType('pie')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  currentSlide.chartData?.type === 'pie'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="Кругова діаграма"
              >
                <PieIcon size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Slide Show & Actions */}
        <div className="flex items-center gap-2">
          {/* Slide Show (Fullscreen Presentation) Button */}
          <button
            type="button"
            onClick={() => setIsPresentationMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer border border-indigo-400/30"
            title="Показ слайдів на весь екран (F5)"
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">Показ слайдів</span>
          </button>

          {onSave && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleExport('save')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                isSavedRecently
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-purple-600 hover:bg-purple-500'
              }`}
              title="Зберегти презентацію"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isSavedRecently ? (
                <Check size={14} className="text-white" />
              ) : (
                <Save size={14} />
              )}
              <span>{isSavedRecently ? 'Збережено!' : 'Зберегти'}</span>
            </button>
          )}

          {onSendDirectly && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleExport('send')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Надіслати у чат"
            >
              <Send size={13} />
              <span>Надіслати</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Save Notification Toast */}
      {isSavedRecently && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-fadeIn border border-emerald-400/40">
          <Check size={16} className="text-white" />
          <span>Презентацію збережено успішно</span>
        </div>
      )}

      {/* 2. Main Stage with Left Thumbnail Rail */}
      <div className="flex flex-col md:flex-row gap-3 p-3 sm:p-5 items-start justify-center flex-1 min-h-[580px]">
        {/* Left Slide Thumbnails Rail */}
        <div className="w-full md:w-48 shrink-0 flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto max-h-[64vh] custom-scrollbar p-2 bg-[#161722]/90 border border-white/10 rounded-2xl select-none presentation-thumbnail-rail">
          {slides.map((s, idx) => {
            const hasBg = !!s.themeBackground;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveSlideIndex(idx);
                  onPageChange?.(idx + 1);
                }}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  activeSlideIndex === idx
                    ? 'bg-orange-500/20 border-orange-500/80 shadow-md ring-1 ring-orange-500/40'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-xs font-bold text-gray-400 w-4 text-center shrink-0">
                  {idx + 1}
                </span>

                {/* Miniature slide preview: 1:1 PowerPoint image or styled theme */}
                <div
                  className={`flex-1 ${
                    globalAspectRatio === '4:3' ? 'aspect-[4/3]' : 'aspect-[16/9]'
                  } rounded-md border border-gray-400/40 flex flex-col justify-between overflow-hidden shadow-xs relative bg-white`}
                >
                  {s.slideImageUrl ? (
                    <img
                      src={s.slideImageUrl}
                      alt={s.title || `Слайд ${idx + 1}`}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col justify-between p-1.5 overflow-hidden"
                      style={{
                        backgroundImage: hasBg ? `url(${s.themeBackground})` : undefined,
                        backgroundSize: '100% 100%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: hasBg ? 'transparent' : '#ffffff',
                      }}
                    >
                      {!hasBg && (
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: activeThemeObj.banner }}
                        />
                      )}

                      <div className="z-10 bg-white/70 backdrop-blur-xs px-1 py-0.5 rounded">
                        <span className="text-[8px] font-bold text-gray-900 block truncate leading-tight">
                          {s.title || `Слайд ${idx + 1}`}
                        </span>
                        <span className="text-[7px] text-gray-600 block truncate">
                          {s.layoutType === 'table'
                            ? 'Таблиця'
                            : s.layoutType === 'chart'
                              ? 'Діаграма'
                              : s.paragraphs[0] || s.subtitle || ''}
                        </span>
                      </div>
                    </div>
                  )}

                  <span className="absolute bottom-1 right-1 text-[7px] font-bold text-gray-700 bg-white/90 px-1 rounded shadow-xs z-10">
                    {idx + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Slide Stage */}
        <div className="flex-1 w-full flex flex-col items-center presentation-active-stage">
          <div
            key={activeSlideIndex}
            className={`relative w-full ${
              globalAspectRatio === '4:3'
                ? 'aspect-[4/3] max-w-[780px]'
                : 'aspect-[16/9] max-w-[880px]'
            } max-h-[64vh] rounded-2xl shadow-2xl border border-gray-400/30 overflow-hidden flex flex-col text-gray-900 transition-all animate-fadeIn`}
            style={{
              backgroundImage:
                viewMode === 'edit' && currentSlide?.themeBackground
                  ? `url(${currentSlide.themeBackground})`
                  : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#ffffff',
            }}
          >
            {viewMode === 'preview' && currentSlide?.slideImageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-[#13141c] select-none">
                <img
                  src={currentSlide.slideImageUrl}
                  alt={currentSlide.title || `Слайд ${activeSlideIndex + 1}`}
                  className="w-full h-full object-contain pointer-events-none select-none rounded-2xl"
                />
              </div>
            ) : (
              <>
                {/* Top decorative theme accent if no custom master background */}
                {!currentSlide?.themeBackground && (
                  <div
                    className="w-full h-2.5 shrink-0"
                    style={{
                      background: `linear-gradient(90deg, ${activeThemeObj.banner} 0%, #38bdf8 100%)`,
                    }}
                  />
                )}

                {/* Slide Content Safe Area */}
                <div
                  className={`flex-1 flex flex-col p-6 sm:p-10 overflow-y-auto custom-scrollbar ${
                    currentSlide?.themeBackground
                      ? 'bg-white/85 backdrop-blur-[2px] m-4 sm:m-6 rounded-xl shadow-md border border-gray-200/80'
                      : ''
                  }`}
                >
                  {/* SLIDE LAYOUT 1: TITLE SLIDE */}
                  {currentSlide?.layoutType === 'title' && (
                    <div className="flex-1 flex flex-col justify-center gap-4 py-4">
                      <SlideEditableText
                        value={currentSlide?.title || ''}
                        onChange={(val) => {
                          handleUpdateTitle(val);
                          setIsModified(true);
                        }}
                        placeholder="Введіть заголовок слайда..."
                        className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 border-b border-gray-300/60 pb-3 bg-transparent w-full"
                      />

                      {/* Subtitle / Descriptive Text Box */}
                      <div className="space-y-3">
                        {currentSlide?.paragraphs && currentSlide.paragraphs.length > 0 ? (
                          currentSlide.paragraphs.map((p, pIdx) => (
                            <div key={pIdx} className="group/item flex items-start gap-3 relative">
                              <div className="flex-1 min-w-0">
                                <SlideEditableText
                                  value={p}
                                  onChange={(val) => {
                                    handleUpdateParagraph(pIdx, val);
                                    setIsModified(true);
                                  }}
                                  placeholder="Введіть підзаголовок або текст..."
                                  className="text-base sm:text-lg text-gray-700 leading-relaxed font-normal"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteParagraph(pIdx);
                                  setIsModified(true);
                                }}
                                className="opacity-0 group-hover/item:opacity-100 p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 shadow-xs transition-all cursor-pointer shrink-0 mt-0.5"
                                title="Видалити абзац"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <SlideEditableText
                            value={currentSlide?.subtitle || ''}
                            onChange={(val) => {
                              handleUpdateSubtitle(val);
                              setIsModified(true);
                            }}
                            placeholder="Введіть підзаголовок..."
                            className="text-lg sm:text-xl text-gray-600 leading-relaxed font-normal"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* SLIDE LAYOUT 2: CONTENT SLIDE */}
                  {currentSlide?.layoutType === 'content' && (
                    <div className="flex-1 flex flex-col gap-4">
                      <SlideEditableText
                        value={currentSlide?.title || ''}
                        onChange={(val) => {
                          handleUpdateTitle(val);
                          setIsModified(true);
                        }}
                        placeholder="Введіть заголовок слайда..."
                        className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 border-b border-gray-200/80 pb-2 mb-2 bg-transparent w-full"
                      />

                      {/* Slide Content Paragraphs (Auto-resizing, clean bullet toggle!) */}
                      <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                        {currentSlide?.paragraphs.map((p, pIdx) => (
                          <div key={pIdx} className="group/item flex items-start gap-3 relative">
                            {currentSlide.isBulleted && (
                              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-2.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <SlideEditableText
                                value={p}
                                onChange={(val) => {
                                  handleUpdateParagraph(pIdx, val);
                                  setIsModified(true);
                                }}
                                placeholder="Введіть текст..."
                                className="text-base sm:text-lg text-gray-800 leading-relaxed"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteParagraph(pIdx);
                                setIsModified(true);
                              }}
                              className="opacity-0 group-hover/item:opacity-100 p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 shadow-xs transition-all cursor-pointer shrink-0 mt-0.5"
                              title="Видалити пункт"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SLIDE LAYOUT 3: TABLE SLIDE */}
                  {currentSlide?.layoutType === 'table' && currentSlide?.tableData && (
                    <div className="flex-1 flex flex-col gap-3">
                      <SlideEditableText
                        value={currentSlide?.title || ''}
                        onChange={(val) => {
                          handleUpdateTitle(val);
                          setIsModified(true);
                        }}
                        placeholder="Введіть заголовок таблиці..."
                        className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 border-b border-gray-200/80 pb-2 mb-1 bg-transparent w-full"
                      />

                      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar rounded-xl border border-gray-300 shadow-sm">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead className="bg-[#2b579a] text-white">
                            <tr>
                              {currentSlide.tableData.headers.map((h, colIdx) => (
                                <th
                                  key={colIdx}
                                  className="p-2 sm:p-2.5 border-r border-blue-400/30 font-semibold"
                                >
                                  <input
                                    type="text"
                                    value={h}
                                    onChange={(e) =>
                                      handleUpdateTableHeader(colIdx, e.target.value)
                                    }
                                    className="w-full bg-transparent text-white font-semibold outline-none"
                                  />
                                </th>
                              ))}
                              <th className="w-8 p-1 text-center" />
                            </tr>
                          </thead>
                          <tbody>
                            {currentSlide.tableData.rows.map((row, rowIdx) => (
                              <tr
                                key={rowIdx}
                                className={`border-b border-gray-200 hover:bg-blue-50/50 transition-colors ${
                                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                }`}
                              >
                                {row.map((cell, colIdx) => (
                                  <td key={colIdx} className="p-2 border-r border-gray-200">
                                    <input
                                      type="text"
                                      value={cell}
                                      onChange={(e) =>
                                        handleUpdateTableCell(rowIdx, colIdx, e.target.value)
                                      }
                                      className="w-full bg-transparent text-gray-800 outline-none"
                                    />
                                  </td>
                                ))}
                                <td className="p-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTableRow(rowIdx)}
                                    className="p-1 rounded hover:bg-rose-100 text-rose-500 cursor-pointer"
                                    title="Видалити рядок"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SLIDE LAYOUT 4: CHART SLIDE */}
                  {currentSlide?.layoutType === 'chart' && currentSlide?.chartData && (
                    <div className="flex-1 flex flex-col gap-3">
                      <SlideEditableText
                        value={currentSlide?.title || ''}
                        onChange={(val) => {
                          handleUpdateTitle(val);
                          setIsModified(true);
                        }}
                        placeholder="Введіть заголовок діаграми..."
                        className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 border-b border-gray-200/80 pb-2 mb-1 bg-transparent w-full"
                      />

                      {/* SVG Chart Visualization */}
                      <div className="flex-1 flex flex-col items-center justify-center p-2 bg-gradient-to-b from-gray-50 to-slate-100 rounded-xl border border-gray-200 shadow-inner">
                        {currentSlide.chartData.type === 'bar' && (
                          <div className="w-full h-full max-h-[36vh] flex flex-col justify-end">
                            {/* Bars Area */}
                            <div className="flex-1 flex items-end justify-around gap-2 px-4 pb-2 border-b border-gray-300">
                              {currentSlide.chartData.categories.map((cat, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="flex-1 flex flex-col items-center justify-end h-full max-w-[100px]"
                                >
                                  <div className="flex items-end gap-1.5 h-full w-full justify-center">
                                    {currentSlide.chartData?.series.map((s, sIdx) => {
                                      const val = s.values[cIdx] || 0;
                                      const heightPct = Math.min(100, Math.max(10, val));
                                      return (
                                        <div
                                          key={sIdx}
                                          className="flex-1 max-w-[28px] rounded-t-md transition-all duration-300 hover:brightness-110 flex flex-col justify-end items-center relative group"
                                          style={{
                                            height: `${heightPct}%`,
                                            background:
                                              sIdx === 0
                                                ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                                                : 'linear-gradient(180deg, #10b981 0%, #047857 100%)',
                                          }}
                                        >
                                          <span className="text-[10px] font-bold text-white mb-1 drop-shadow-xs">
                                            {val}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <span className="text-[11px] font-semibold text-gray-600 mt-2 truncate w-full text-center">
                                    {cat}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center justify-center gap-4 mt-2">
                              {currentSlide.chartData.series.map((s, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex items-center gap-1.5 text-xs text-gray-700 font-medium"
                                >
                                  <span
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: sIdx === 0 ? '#2563eb' : '#10b981' }}
                                  />
                                  <span>{s.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {currentSlide.chartData.type === 'line' && (
                          <div className="w-full h-full max-h-[36vh] flex flex-col items-center justify-center p-4">
                            <svg className="w-full h-44 overflow-visible" viewBox="0 0 400 120">
                              {/* Grid Lines */}
                              <line
                                x1="20"
                                y1="20"
                                x2="380"
                                y2="20"
                                stroke="#e2e8f0"
                                strokeDasharray="3 3"
                              />
                              <line
                                x1="20"
                                y1="60"
                                x2="380"
                                y2="60"
                                stroke="#e2e8f0"
                                strokeDasharray="3 3"
                              />
                              <line x1="20" y1="100" x2="380" y2="100" stroke="#cbd5e1" />

                              {/* Line 1 */}
                              <polyline
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="3"
                                points="40,90 140,40 240,65 340,25"
                              />
                              {[
                                [40, 90],
                                [140, 40],
                                [240, 65],
                                [340, 25],
                              ].map(([x, y], i) => (
                                <circle
                                  key={i}
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="#1d4ed8"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                              ))}

                              {/* Line 2 */}
                              <polyline
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="3"
                                points="40,100 140,75 240,85 340,55"
                              />
                              {[
                                [40, 100],
                                [140, 75],
                                [240, 85],
                                [340, 55],
                              ].map(([x, y], i) => (
                                <circle
                                  key={i}
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="#047857"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                              ))}
                            </svg>

                            <div className="flex items-center justify-around w-full text-xs text-gray-600 font-semibold px-6 mt-1">
                              {currentSlide.chartData.categories.map((c, i) => (
                                <span key={i}>{c}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {currentSlide.chartData.type === 'pie' && (
                          <div className="flex items-center justify-center gap-6 p-4">
                            <svg className="w-40 h-40" viewBox="0 0 100 100">
                              {/* Pie wedges */}
                              <circle
                                cx="50"
                                cy="50"
                                r="38"
                                fill="transparent"
                                stroke="#2563eb"
                                strokeWidth="24"
                                strokeDasharray="60 100"
                                strokeDashoffset="0"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="38"
                                fill="transparent"
                                stroke="#10b981"
                                strokeWidth="24"
                                strokeDasharray="30 100"
                                strokeDashoffset="-60"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="38"
                                fill="transparent"
                                stroke="#f59e0b"
                                strokeWidth="24"
                                strokeDasharray="25 100"
                                strokeDashoffset="-90"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="38"
                                fill="transparent"
                                stroke="#8b5cf6"
                                strokeWidth="24"
                                strokeDasharray="25 100"
                                strokeDashoffset="-115"
                              />
                            </svg>
                            <div className="flex flex-col gap-1.5 text-xs text-gray-700">
                              {currentSlide.chartData.categories.map((cat, idx) => {
                                const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
                                return (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: colors[idx % colors.length] }}
                                    />
                                    <span className="font-medium">{cat}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Slide Number Badge (matching genuine PowerPoint) */}
            <div className="absolute right-4 bottom-3 z-10 text-[10px] font-semibold text-gray-500 bg-white/70 px-2 py-0.5 rounded-md shadow-xs">
              {activeSlideIndex + 1}
            </div>

            {/* Slide Navigation Buttons */}
            <button
              type="button"
              disabled={activeSlideIndex <= 0}
              onClick={() => {
                const prev = Math.max(0, activeSlideIndex - 1);
                setActiveSlideIndex(prev);
                onPageChange?.(prev + 1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center disabled:opacity-20 transition-all cursor-pointer shadow active:scale-95 z-20"
              title="Попередній слайд"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={activeSlideIndex >= slides.length - 1}
              onClick={() => {
                const next = Math.min(slides.length - 1, activeSlideIndex + 1);
                setActiveSlideIndex(next);
                onPageChange?.(next + 1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center disabled:opacity-20 transition-all cursor-pointer shadow active:scale-95 z-20"
              title="Наступний слайд"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Speaker Notes */}
          <div className="w-full mt-3 p-2.5 bg-[#161722]/80 border border-white/10 rounded-xl text-xs text-gray-400 presentation-stage-footer">
            <span className="font-semibold text-gray-300 block mb-1">Нотатки до слайда:</span>
            <input
              type="text"
              value={currentSlide?.notes || ''}
              onChange={(e) => {
                const text = e.target.value;
                setSlides((prev) => {
                  const next = [...prev];
                  next[activeSlideIndex] = { ...next[activeSlideIndex], notes: text };
                  return next;
                });
              }}
              placeholder="Додайте нотатки для доповідача..."
              className="w-full bg-transparent text-gray-300 placeholder-gray-600 outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* 3. Fullscreen Presentation Mode (Показ слайдів) */}
      {isPresentationMode && (
        <div className="fixed inset-0 z-50 bg-[#090a10] flex flex-col items-center justify-center p-4 sm:p-10 select-none animate-fadeIn">
          {/* Main Slide Canvas in Presentation Mode */}
          <div
            className={`relative w-full ${
              globalAspectRatio === '4:3'
                ? 'aspect-[4/3] max-w-[960px]'
                : 'aspect-[16/9] max-w-[1100px]'
            } max-h-[86vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-gray-900 border border-white/20`}
            style={{
              backgroundImage:
                !currentSlide?.slideImageUrl && currentSlide?.themeBackground
                  ? `url(${currentSlide.themeBackground})`
                  : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#ffffff',
            }}
          >
            {currentSlide?.slideImageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black/40 select-none">
                <img
                  src={currentSlide.slideImageUrl}
                  alt={currentSlide.title || `Слайд ${activeSlideIndex + 1}`}
                  className="w-full h-full object-contain pointer-events-none select-none rounded-2xl"
                />
              </div>
            ) : (
              <>
                {/* Top theme banner if no custom background */}
                {!currentSlide?.themeBackground && (
                  <div
                    className="w-full h-3 shrink-0"
                    style={{
                      background: `linear-gradient(90deg, ${activeThemeObj.banner} 0%, #38bdf8 100%)`,
                    }}
                  />
                )}

                {/* Slide Presentation View */}
                <div
                  className={`flex-1 flex flex-col p-8 sm:p-14 overflow-hidden ${
                    currentSlide?.themeBackground
                      ? 'bg-white/85 backdrop-blur-[2px] m-6 sm:m-8 rounded-xl shadow-md border border-gray-200/80'
                      : ''
                  }`}
                >
                  {currentSlide?.layoutType === 'title' && (
                    <div className="flex-1 flex flex-col justify-center gap-6">
                      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
                        {currentSlide.title}
                      </h1>
                      {currentSlide.paragraphs.length > 0 ? (
                        currentSlide.paragraphs.map((p, idx) => (
                          <p
                            key={idx}
                            className="text-lg sm:text-xl text-gray-700 leading-relaxed font-normal"
                          >
                            {p}
                          </p>
                        ))
                      ) : (
                        <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed font-normal">
                          {currentSlide.subtitle}
                        </p>
                      )}
                    </div>
                  )}

                  {currentSlide?.layoutType === 'content' && (
                    <div className="flex-1 flex flex-col gap-6">
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 border-b border-gray-300 pb-3">
                        {currentSlide.title}
                      </h2>
                      <div className="space-y-4 overflow-y-auto custom-scrollbar">
                        {currentSlide.paragraphs.map((p, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            {currentSlide.isBulleted && (
                              <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-2.5" />
                            )}
                            <p className="text-lg sm:text-xl text-gray-800 leading-relaxed font-medium">
                              {p}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentSlide?.layoutType === 'table' && currentSlide?.tableData && (
                    <div className="flex-1 flex flex-col gap-4">
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 border-b border-gray-300 pb-3">
                        {currentSlide.title}
                      </h2>
                      <div className="flex-1 overflow-auto rounded-xl border border-gray-300 shadow-md">
                        <table className="w-full text-left border-collapse text-base">
                          <thead className="bg-[#2b579a] text-white">
                            <tr>
                              {currentSlide.tableData.headers.map((h, i) => (
                                <th key={i} className="p-3 border-r border-blue-400/30 font-bold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentSlide.tableData.rows.map((row, rI) => (
                              <tr
                                key={rI}
                                className={`border-b border-gray-200 ${rI % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                              >
                                {row.map((cell, cI) => (
                                  <td
                                    key={cI}
                                    className="p-3 border-r border-gray-200 font-medium text-gray-800"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {currentSlide?.layoutType === 'chart' && currentSlide?.chartData && (
                    <div className="flex-1 flex flex-col gap-4">
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 border-b border-gray-300 pb-3">
                        {currentSlide.title}
                      </h2>
                      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-slate-100 rounded-xl border border-gray-200 shadow-inner">
                        <div className="w-full h-full max-h-[46vh] flex flex-col justify-end">
                          <div className="flex-1 flex items-end justify-around gap-4 px-6 pb-4 border-b border-gray-300">
                            {currentSlide.chartData.categories.map((cat, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex-1 flex flex-col items-center justify-end h-full"
                              >
                                <div className="flex items-end gap-2 h-full w-full justify-center">
                                  {currentSlide.chartData?.series.map((s, sIdx) => {
                                    const val = s.values[cIdx] || 0;
                                    const heightPct = Math.min(100, Math.max(10, val));
                                    return (
                                      <div
                                        key={sIdx}
                                        className="flex-1 max-w-[38px] rounded-t-md flex flex-col justify-end items-center"
                                        style={{
                                          height: `${heightPct}%`,
                                          background:
                                            sIdx === 0
                                              ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                                              : 'linear-gradient(180deg, #10b981 0%, #047857 100%)',
                                        }}
                                      >
                                        <span className="text-xs font-bold text-white mb-1 drop-shadow-sm">
                                          {val}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <span className="text-xs font-bold text-gray-700 mt-2 truncate">
                                  {cat}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-center gap-6 mt-4">
                            {currentSlide.chartData.series.map((s, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex items-center gap-2 text-sm text-gray-700 font-semibold"
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-sm"
                                  style={{ backgroundColor: sIdx === 0 ? '#2563eb' : '#10b981' }}
                                />
                                <span>{s.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="absolute right-6 bottom-4 text-xs font-bold text-gray-500 bg-white/80 px-2.5 py-1 rounded-md">
              Слайд {activeSlideIndex + 1} з {slides.length}
            </div>
          </div>

          {/* Floating Presentation Controls Pill */}
          <div
            className="fixed bottom-6 z-50 flex items-center gap-3 px-4 py-2 rounded-full border border-white/20 shadow-2xl backdrop-blur-2xl"
            style={{
              background: 'rgba(20, 22, 34, 0.88)',
            }}
          >
            <button
              type="button"
              disabled={activeSlideIndex <= 0}
              onClick={() => {
                const prev = Math.max(0, activeSlideIndex - 1);
                setActiveSlideIndex(prev);
                onPageChange?.(prev + 1);
              }}
              className="p-1.5 rounded-full hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer"
              title="Попередній (Arrow Left)"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-xs font-semibold text-gray-200">
              {activeSlideIndex + 1} / {slides.length}
            </span>

            <button
              type="button"
              disabled={activeSlideIndex >= slides.length - 1}
              onClick={() => {
                const next = Math.min(slides.length - 1, activeSlideIndex + 1);
                setActiveSlideIndex(next);
                onPageChange?.(next + 1);
              }}
              className="p-1.5 rounded-full hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer"
              title="Наступний (Arrow Right / Space)"
            >
              <ChevronRight size={18} />
            </button>

            <div className="w-px h-4 bg-white/20 mx-1" />

            <button
              type="button"
              onClick={() => setIsPresentationMode(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
              title="Вийти з показу (Escape)"
            >
              <X size={14} />
              <span>Закрити</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Custom Colors Modal ("Спеціальні кольори" - Matching Microsoft Office - Screenshot 3) */}
      {isCustomColorModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsCustomColorModalOpen(false)}
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[360px] bg-[#1e202e] border border-white/20 rounded-2xl shadow-2xl p-5 text-white flex flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-gray-100">Спеціальні кольори</h3>
              <button
                type="button"
                onClick={() => setIsCustomColorModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Закрити"
              >
                <X size={16} />
              </button>
            </div>

            {/* 2D Saturation / Value Gradient Picker */}
            <div
              className="relative w-full h-40 rounded-xl overflow-hidden cursor-crosshair border border-white/25 select-none shadow-inner"
              style={{
                backgroundColor: `hsl(${customHue}, 100%, 50%)`,
              }}
              onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const handleMove = (moveEvt: MouseEvent) => {
                  const x = Math.max(0, Math.min(rect.width, moveEvt.clientX - rect.left));
                  const y = Math.max(0, Math.min(rect.height, moveEvt.clientY - rect.top));
                  const s = Math.round((x / rect.width) * 100);
                  const v = Math.round((1 - y / rect.height) * 100);
                  setCustomSat(s);
                  setCustomVal(v);
                  const rgb = hsvToRgb(customHue, s, v);
                  setCustomRgb(rgb);
                  setCustomHex(rgbToHex(rgb[0], rgb[1], rgb[2]));
                };
                handleMove(e.nativeEvent);
                const handleUp = () => {
                  window.removeEventListener('mousemove', handleMove);
                  window.removeEventListener('mouseup', handleUp);
                };
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
              }}
            >
              {/* Horizontal white gradient */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }}
              />
              {/* Vertical black gradient */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, #000000, transparent)' }}
              />
              {/* Cursor Indicator */}
              <div
                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2 ring-1 ring-black/40"
                style={{
                  left: `${customSat}%`,
                  top: `${100 - customVal}%`,
                  backgroundColor: `#${customHex}`,
                }}
              />
            </div>

            {/* Hue Bar Slider & Swatch Preview */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="360"
                value={customHue}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  setCustomHue(h);
                  const rgb = hsvToRgb(h, customSat, customVal);
                  setCustomRgb(rgb);
                  setCustomHex(rgbToHex(rgb[0], rgb[1], rgb[2]));
                }}
                className="flex-1 h-3.5 rounded-lg appearance-none cursor-pointer outline-none border border-white/20"
                style={{
                  background:
                    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                }}
              />
              <div
                className="w-9 h-9 rounded-xl border border-white/30 shadow-inner shrink-0"
                style={{ backgroundColor: `#${customHex}` }}
                title={`#${customHex}`}
              />
            </div>

            {/* Hex & RGB inputs */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-medium">Шістнадцятковий</label>
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                    setCustomHex(val);
                    if (val.length === 6) {
                      const rgb = hexToRgb(val);
                      setCustomRgb(rgb);
                    }
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none font-mono focus:border-blue-400"
                  placeholder="000000"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-medium">Червоний</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={customRgb[0]}
                  onChange={(e) => {
                    const r = Math.max(0, Math.min(255, Number(e.target.value)));
                    const rgb: [number, number, number] = [r, customRgb[1], customRgb[2]];
                    setCustomRgb(rgb);
                    setCustomHex(rgbToHex(rgb[0], rgb[1], rgb[2]));
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-medium">Зелений</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={customRgb[1]}
                  onChange={(e) => {
                    const g = Math.max(0, Math.min(255, Number(e.target.value)));
                    const rgb: [number, number, number] = [customRgb[0], g, customRgb[2]];
                    setCustomRgb(rgb);
                    setCustomHex(rgbToHex(rgb[0], rgb[1], rgb[2]));
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-medium">Синій</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={customRgb[2]}
                  onChange={(e) => {
                    const b = Math.max(0, Math.min(255, Number(e.target.value)));
                    const rgb: [number, number, number] = [customRgb[0], customRgb[1], b];
                    setCustomRgb(rgb);
                    setCustomHex(rgbToHex(rgb[0], rgb[1], rgb[2]));
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsCustomColorModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => handleApplyColor(`#${customHex}`)}
                className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                ОК
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Enterprise Presentation Print Container (Rendered exclusively for window.print()) */}
      <div className="hidden print:block presentation-print-root">
        {slides.map((s, idx) => (
          <div
            key={idx}
            className="print-slide-item"
            style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
          >
            {s.slideImageUrl ? (
              <img
                src={s.slideImageUrl}
                alt={s.title || `Слайд ${idx + 1}`}
                className="max-w-[100vw] max-h-[100vh] w-auto h-auto object-contain"
              />
            ) : (
              <div
                className={`w-[90vw] ${
                  globalAspectRatio === '4:3' ? 'aspect-[4/3]' : 'aspect-[16/9]'
                } rounded-xl border border-gray-300 p-10 flex flex-col justify-between shadow-none bg-white text-gray-900 relative`}
                style={{
                  backgroundImage: s.themeBackground ? `url(${s.themeBackground})` : undefined,
                  backgroundSize: '100% 100%',
                }}
              >
                {!s.themeBackground && (
                  <div
                    className="absolute top-0 left-0 right-0 h-4 rounded-t-xl"
                    style={{ background: activeThemeObj.banner }}
                  />
                )}
                <h2 className="text-3xl font-extrabold tracking-tight mt-4">{s.title}</h2>
                <div className="flex-1 my-6 space-y-3">
                  {s.paragraphs.map((p, pIdx) => (
                    <div key={pIdx} className="text-lg leading-relaxed flex items-start gap-2">
                      {s.isBulleted && (
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-2" />
                      )}
                      <div dangerouslySetInnerHTML={{ __html: p }} />
                    </div>
                  ))}
                </div>
                <div className="text-right text-xs font-semibold text-gray-500">{idx + 1}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Print Stylesheet for clean 100% PowerPoint-grade printing */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          #root {
            display: none !important;
          }
          div[role="dialog"] {
            position: static !important;
            background: #ffffff !important;
            inset: auto !important;
            overflow: visible !important;
            display: block !important;
            height: auto !important;
            width: 100% !important;
          }
          div[role="dialog"] > header,
          div[role="dialog"] > footer,
          .no-print,
          button,
          .presentation-editor-toolbar,
          .presentation-thumbnail-rail,
          .presentation-active-stage,
          .presentation-stage-footer {
            display: none !important;
          }
          .presentation-print-root {
            display: block !important;
            width: 100vw !important;
            height: auto !important;
            background: #ffffff !important;
          }
          .print-slide-item {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          .print-slide-item img {
            max-width: 100vw !important;
            max-height: 100vh !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
          }
        }
      `}</style>
    </div>
  );
}
