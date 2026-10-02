import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Trash2,
  Save,
  Send,
  Download,
  Palette,
  Highlighter,
  ChevronDown,
  RotateCcw,
  Check,
  Type,
} from 'lucide-react';
import { exportDocxToFile } from '../../lib/documentExporters';
import { DocxPageSettings } from '../../lib/documentParsers';

interface WordDocumentEditorProps {
  initialPages: string[];
  fileName: string;
  pageSettings?: DocxPageSettings;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (total: number) => void;
  onSave?: (editedFile: File) => void;
  onSendDirectly?: (editedFile: File) => void;
  onDownload?: (editedFile: File) => void;
}

interface DocumentSnapshot {
  pages: string[];
  activePageIndex: number;
}

// 24 Curated Microsoft Word Theme Colors
const WORD_THEME_COLORS = [
  // Row 1: Deep / Corporate Classic
  ['#000000', '#1e293b', '#1e3a8a', '#15803d', '#b91c1c', '#b45309', '#6b21a8', '#0f766e'],
  // Row 2: Standard Vibrant
  ['#334155', '#475569', '#2563eb', '#16a34a', '#dc2626', '#ea580c', '#9333ea', '#0d9488'],
  // Row 3: Soft / Pastel
  ['#94a3b8', '#cbd5e1', '#60a5fa', '#34d399', '#f87171', '#fb923c', '#c084fc', '#2dd4bf'],
];

// Microsoft Word Text Highlighter Colors
const WORD_HIGHLIGHT_COLORS = [
  { name: 'Жовтий', color: '#fef08a' },
  { name: 'Зелений', color: '#bbf7d0' },
  { name: 'Блакитний', color: '#a5f3fc' },
  { name: 'Рожевий', color: '#fbcfe8' },
  { name: 'Помаранчевий', color: '#fed7aa' },
  { name: 'Фіолетовий', color: '#e9d5ff' },
];

const FONT_FAMILIES = [
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
];

const FONT_SIZES = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px (Word)', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
];

const DEFAULT_PAGE_SETTINGS: DocxPageSettings = {
  width: 794,
  height: 1123,
  marginTop: 56,
  marginBottom: 56,
  marginLeft: 64,
  marginRight: 64,
  orientation: 'portrait',
};

export default function WordDocumentEditor({
  initialPages,
  fileName,
  pageSettings,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  onSave,
  onSendDirectly,
  onDownload,
}: WordDocumentEditorProps) {
  const docPageSettings = pageSettings || DEFAULT_PAGE_SETTINGS;
  const [animatingPageIndex, setAnimatingPageIndex] = useState<number | null>(null);
  const isRepaginatingRef = useRef(false);

  // We maintain page content in a ref to avoid React re-rendering contentEditable on every keystroke!
  // This solves the bug where Backspace / typing drops focus ("снимает статус печати")
  // and resets scroll to the top ("перекидывает интерфейс вверх").
  const pagesContentRef = useRef<string[]>(
    initialPages.length > 0 ? [...initialPages] : ['<p>Почніть введення тексту...</p>'],
  );
  const [pageCount, setPageCount] = useState<number>(pagesContentRef.current.length);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Reset animation flag after page slide-in completes
  useEffect(() => {
    if (animatingPageIndex !== null) {
      const timer = setTimeout(() => {
        setAnimatingPageIndex(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [animatingPageIndex]);

  // Formatting state
  const [currentTextColor, setCurrentTextColor] = useState<string>('#1e293b');
  const [currentHighlightColor, setCurrentHighlightColor] = useState<string>('#fef08a');
  const [isTextColorPickerOpen, setIsTextColorPickerOpen] = useState(false);
  const [isHighlightPickerOpen, setIsHighlightPickerOpen] = useState(false);
  const [isFontFamilyOpen, setIsFontFamilyOpen] = useState(false);
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>('Times New Roman');
  const [selectedFontSize, setSelectedFontSize] = useState<string>('16px (Word)');

  // Undo / Redo history stack
  const historyRef = useRef<DocumentSnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // DOM Refs
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textColorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastReportedPageRef = useRef<number>(1);

  // Initialize initial history snapshot
  useEffect(() => {
    if (historyRef.current.length === 0) {
      const initialSnapshot: DocumentSnapshot = {
        pages: [...pagesContentRef.current],
        activePageIndex: 0,
      };
      historyRef.current = [initialSnapshot];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, []);

  // Update undo/redo availability flags
  const updateUndoRedoFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Record an undo snapshot (captures latest HTML from pageRefs)
  const recordSnapshot = useCallback(
    (explicitActiveIndex?: number) => {
      // Gather latest HTML from live DOM elements
      const currentPages = pagesContentRef.current.map((fallback, idx) => {
        const el = pageRefs.current[idx];
        return el ? el.innerHTML : fallback;
      });

      const activeIdx = explicitActiveIndex !== undefined ? explicitActiveIndex : activePageIndex;

      // Don't push duplicate snapshots
      const lastSnap = historyRef.current[historyIndexRef.current];
      if (
        lastSnap &&
        lastSnap.pages.length === currentPages.length &&
        lastSnap.pages.every((p, i) => p === currentPages[i])
      ) {
        return;
      }

      // Truncate any redo branch if we are in middle of stack
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);

      newHistory.push({
        pages: currentPages,
        activePageIndex: activeIdx,
      });

      // Keep max 50 snapshots to prevent memory bloat
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
      updateUndoRedoFlags();
    },
    [activePageIndex, updateUndoRedoFlags],
  );

  // Debounced snapshot for continuous typing
  const scheduleTypingSnapshot = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      recordSnapshot();
    }, 450);
  }, [recordSnapshot]);

  // Execute Undo
  const handleUndo = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (historyIndexRef.current <= 0) return;

    historyIndexRef.current -= 1;
    const targetSnapshot = historyRef.current[historyIndexRef.current];
    if (!targetSnapshot) return;

    // Apply snapshot to refs and live DOM
    pagesContentRef.current = [...targetSnapshot.pages];
    setPageCount(targetSnapshot.pages.length);
    onTotalPagesChange?.(targetSnapshot.pages.length);

    targetSnapshot.pages.forEach((html, idx) => {
      const el = pageRefs.current[idx];
      if (el && el.innerHTML !== html) {
        el.innerHTML = html;
      }
    });

    const targetIdx = Math.min(targetSnapshot.activePageIndex, targetSnapshot.pages.length - 1);
    setActivePageIndex(targetIdx);
    updateUndoRedoFlags();

    // Focus active page without resetting scroll
    setTimeout(() => {
      const el = pageRefs.current[targetIdx];
      if (el && document.activeElement !== el && !el.contains(document.activeElement)) {
        el.focus({ preventScroll: true });
      }
    }, 20);
  }, [onTotalPagesChange, updateUndoRedoFlags]);

  // Execute Redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current += 1;
    const targetSnapshot = historyRef.current[historyIndexRef.current];
    if (!targetSnapshot) return;

    // Apply snapshot to refs and live DOM
    pagesContentRef.current = [...targetSnapshot.pages];
    setPageCount(targetSnapshot.pages.length);
    onTotalPagesChange?.(targetSnapshot.pages.length);

    targetSnapshot.pages.forEach((html, idx) => {
      const el = pageRefs.current[idx];
      if (el && el.innerHTML !== html) {
        el.innerHTML = html;
      }
    });

    const targetIdx = Math.min(targetSnapshot.activePageIndex, targetSnapshot.pages.length - 1);
    setActivePageIndex(targetIdx);
    updateUndoRedoFlags();

    // Focus active page without resetting scroll
    setTimeout(() => {
      const el = pageRefs.current[targetIdx];
      if (el && document.activeElement !== el && !el.contains(document.activeElement)) {
        el.focus({ preventScroll: true });
      }
    }, 20);
  }, [onTotalPagesChange, updateUndoRedoFlags]);

  // Save current DOM selection so toolbar clicks/modals can restore it
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el =
        container.nodeType === Node.ELEMENT_NODE
          ? (container as HTMLElement)
          : container.parentElement;
      if (el?.closest('[data-doc-editable]')) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  // Restore DOM selection
  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  }, []);

  // Listen to selection changes to preserve active range
  useEffect(() => {
    const handleSelectionChange = () => {
      saveSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [saveSelection]);

  // Populate DOM content once when page elements mount
  useEffect(() => {
    pagesContentRef.current.forEach((html, pIdx) => {
      const el = pageRefs.current[pIdx];
      if (el && !el.hasAttribute('data-initialized')) {
        el.innerHTML = html || '<p><br></p>';
        el.setAttribute('data-initialized', 'true');
      }
    });
  }, [pageCount]);

  // Formatting execution on current selection
  const execFormat = useCallback(
    (command: string, value: string = '') => {
      restoreSelection();
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch {
        // ignore
      }
      document.execCommand(command, false, value);
      recordSnapshot();
    },
    [recordSnapshot, restoreSelection],
  );

  // Microsoft Word Alignment with automatic block detection & styling
  const applyAlignment = useCallback(
    (align: 'left' | 'center' | 'right' | 'justify') => {
      restoreSelection();
      const commandMap = {
        left: 'justifyLeft',
        center: 'justifyCenter',
        right: 'justifyRight',
        justify: 'justifyFull',
      };

      try {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand(commandMap[align], false, '');
      } catch {
        // fallback
      }

      // Also ensure the enclosing block element (p, h1, h2, h3, li, td, etc.) receives textAlign style
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let node: Node | null = sel.anchorNode;
        while (
          node &&
          node !== document.body &&
          !(node instanceof HTMLElement && node.getAttribute('contenteditable') === 'true')
        ) {
          if (
            node instanceof HTMLElement &&
            [
              'P',
              'H1',
              'H2',
              'H3',
              'H4',
              'H5',
              'H6',
              'LI',
              'DIV',
              'TD',
              'TH',
              'BLOCKQUOTE',
            ].includes(node.tagName)
          ) {
            node.style.textAlign = align;
            break;
          }
          node = node.parentNode;
        }
      }

      // Sync ref with live DOM
      const el = pageRefs.current[activePageIndex];
      if (el) {
        pagesContentRef.current[activePageIndex] = el.innerHTML;
      }

      recordSnapshot();
    },
    [activePageIndex, recordSnapshot, restoreSelection],
  );

  // Apply Font Color (Word style)
  const applyTextColor = useCallback(
    (color: string) => {
      restoreSelection();
      setCurrentTextColor(color);
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch {
        // ignore
      }
      document.execCommand('foreColor', false, color);

      // Sync ref
      const el = pageRefs.current[activePageIndex];
      if (el) {
        pagesContentRef.current[activePageIndex] = el.innerHTML;
      }
      recordSnapshot();
      setIsTextColorPickerOpen(false);
    },
    [activePageIndex, recordSnapshot, restoreSelection],
  );

  // Apply Highlight / Marker Color (Word style)
  const applyHighlightColor = useCallback(
    (color: string) => {
      restoreSelection();
      setCurrentHighlightColor(color);
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch {
        // ignore
      }

      if (color === 'transparent') {
        document.execCommand('removeFormat', false, '');
      } else {
        document.execCommand('hiliteColor', false, color);
      }

      const el = pageRefs.current[activePageIndex];
      if (el) {
        pagesContentRef.current[activePageIndex] = el.innerHTML;
      }
      recordSnapshot();
      setIsHighlightPickerOpen(false);
    },
    [activePageIndex, recordSnapshot, restoreSelection],
  );

  // Apply Font Family (Word style)
  const applyFontFamily = useCallback(
    (family: string, label: string) => {
      restoreSelection();
      setSelectedFontFamily(label);
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch {
        // ignore
      }
      document.execCommand('fontName', false, family);

      const el = pageRefs.current[activePageIndex];
      if (el) {
        pagesContentRef.current[activePageIndex] = el.innerHTML;
      }
      recordSnapshot();
      setIsFontFamilyOpen(false);
    },
    [activePageIndex, recordSnapshot, restoreSelection],
  );

  // Apply Font Size (Word style)
  const applyFontSize = useCallback(
    (size: string, label: string) => {
      restoreSelection();
      setSelectedFontSize(label);

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      if (range.collapsed) {
        // Apply to current block if collapsed
        let node: Node | null = sel.anchorNode;
        while (
          node &&
          node !== document.body &&
          !(node instanceof HTMLElement && node.getAttribute('contenteditable') === 'true')
        ) {
          if (
            node instanceof HTMLElement &&
            ['P', 'H1', 'H2', 'H3', 'LI', 'SPAN'].includes(node.tagName)
          ) {
            node.style.fontSize = size;
            break;
          }
          node = node.parentNode;
        }
      } else {
        // Wrap selected range in span with font-size
        const span = document.createElement('span');
        span.style.fontSize = size;
        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          sel.addRange(newRange);
        } catch {
          document.execCommand('fontSize', false, '4');
        }
      }

      const el = pageRefs.current[activePageIndex];
      if (el) {
        pagesContentRef.current[activePageIndex] = el.innerHTML;
      }
      recordSnapshot();
      setIsFontSizeOpen(false);
    },
    [activePageIndex, recordSnapshot, restoreSelection],
  );

  // Keyboard shortcut listener (Ctrl+Z Undo, Ctrl+Y Redo, Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+E, Ctrl+L, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (key === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (key === 'b') {
          e.preventDefault();
          execFormat('bold');
        } else if (key === 'i') {
          e.preventDefault();
          execFormat('italic');
        } else if (key === 'u') {
          e.preventDefault();
          execFormat('underline');
        } else if (key === 'e') {
          // Word standard: Ctrl+E = Center
          e.preventDefault();
          applyAlignment('center');
        } else if (key === 'l') {
          // Word standard: Ctrl+L = Align Left
          e.preventDefault();
          applyAlignment('left');
        } else if (key === 'r') {
          // Word standard: Ctrl+R = Align Right
          e.preventDefault();
          applyAlignment('right');
        } else if (key === 'j') {
          // Word standard: Ctrl+J = Justify
          e.preventDefault();
          applyAlignment('justify');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyAlignment, execFormat, handleRedo, handleUndo]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (textColorPickerRef.current && !textColorPickerRef.current.contains(target)) {
        setIsTextColorPickerOpen(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(target)) {
        setIsHighlightPickerOpen(false);
      }
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(target)) {
        setIsFontFamilyOpen(false);
      }
      if (fontSizeRef.current && !fontSizeRef.current.contains(target)) {
        setIsFontSizeOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // IntersectionObserver scroll-spy to dynamically report visible page to parent bottom pill
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        }
        if (bestEntry && bestEntry.target) {
          const idxAttr = bestEntry.target.getAttribute('data-page-index');
          if (idxAttr !== null) {
            const pageNum = parseInt(idxAttr, 10) + 1;
            lastReportedPageRef.current = pageNum;
            setActivePageIndex(pageNum - 1);
            onPageChange?.(pageNum);
          }
        }
      },
      {
        threshold: [0.1, 0.3, 0.5, 0.8],
      },
    );

    pageRefs.current.forEach((el) => {
      if (el) {
        // Observe the parent sheet container which has data-page-index
        const sheet = el.closest('[data-page-index]');
        if (sheet) observer.observe(sheet);
      }
    });

    return () => observer.disconnect();
  }, [pageCount, onPageChange]);

  // Scroll to page when parent updates currentPage via bottom pill clicks (NOT from scroll-spy)
  useEffect(() => {
    if (currentPage && currentPage >= 1 && currentPage <= pageCount) {
      if (currentPage !== lastReportedPageRef.current) {
        lastReportedPageRef.current = currentPage;
        const targetIdx = currentPage - 1;
        setActivePageIndex(targetIdx);
        const el = pageRefs.current[targetIdx];
        if (el) {
          const sheet = el.closest('[data-page-index]');
          if (sheet) {
            sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    }
  }, [currentPage, pageCount]);

  // --- Helper functions for pagination & caret placement ---
  const isCaretAtEndOfElement = (el: HTMLElement): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    try {
      const testRange = document.createRange();
      testRange.selectNodeContents(el);
      testRange.setStart(range.endContainer, range.endOffset);
      const remaining = testRange.toString().replace(/[\r\n\s\u200B]+/g, '');
      return remaining.length === 0;
    } catch {
      return false;
    }
  };

  const isCaretAtStartOfElement = (el: HTMLElement): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    try {
      const testRange = document.createRange();
      testRange.selectNodeContents(el);
      testRange.setEnd(range.startContainer, range.startOffset);
      const preceding = testRange.toString().replace(/[\r\n\s\u200B]+/g, '');
      return preceding.length === 0;
    } catch {
      return false;
    }
  };

  // Calculates remaining vertical space in pixels inside the page editable container
  const getContentRemainingSpace = (el: HTMLElement): number => {
    const containerRect = el.getBoundingClientRect();
    if (!containerRect || containerRect.height <= 0) return 999;

    const children = Array.from(el.children);
    if (children.length === 0) {
      return containerRect.height;
    }

    let maxChildBottom = containerRect.top;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const childRect = child.getBoundingClientRect();
      if (childRect.bottom > maxChildBottom) {
        maxChildBottom = childRect.bottom;
      }
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      try {
        const range = sel.getRangeAt(0);
        const rangeRect = range.getBoundingClientRect();
        if (rangeRect.bottom > maxChildBottom && rangeRect.bottom <= containerRect.bottom + 100) {
          maxChildBottom = rangeRect.bottom;
        }
      } catch {
        // ignore
      }
    }

    return containerRect.bottom - maxChildBottom;
  };

  const isElementVerticallyFull = (el: HTMLElement, thresholdPx: number = 26): boolean => {
    // If the browser reports scroll overflow
    if (el.scrollHeight > el.clientHeight + 4) return true;

    // Remaining vertical space from bottom of lowest element to bottom of page container
    const remaining = getContentRemainingSpace(el);
    return remaining <= thresholdPx;
  };

  const isPageContentEmpty = (el: HTMLElement): boolean => {
    const text = (el.textContent || '').replace(/[\r\n\s\u200B]+/g, '');
    if (text.length > 0) return false;
    const specialElements = el.querySelectorAll('img, table, iframe');
    return specialElements.length === 0;
  };

  const placeCaretAtStart = (el: HTMLElement) => {
    el.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    if (el.firstChild) {
      if (el.firstChild.nodeType === Node.TEXT_NODE) {
        range.setStart(el.firstChild, 0);
      } else {
        range.selectNodeContents(el.firstChild);
        range.collapse(true);
      }
    } else {
      range.setStart(el, 0);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const placeCaretAtEnd = (el: HTMLElement) => {
    el.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const trySplitElement = (elChild: HTMLElement, maxBottom: number): HTMLElement | null => {
    if (elChild.tagName === 'UL' || elChild.tagName === 'OL') {
      const listItems = Array.from(elChild.children);
      const splitIndex = listItems.findIndex((li) => li.getBoundingClientRect().bottom > maxBottom);
      if (splitIndex > 0) {
        const newList = document.createElement(elChild.tagName) as HTMLElement;
        for (let i = splitIndex; i < listItems.length; i++) {
          newList.appendChild(listItems[i]);
        }
        return newList;
      }
      return null;
    }

    const text = elChild.textContent || '';
    if (text.length < 15) return null;

    const range = document.createRange();
    const walker = document.createTreeWalker(elChild, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let curr = walker.nextNode();
    while (curr) {
      textNodes.push(curr as Text);
      curr = walker.nextNode();
    }

    if (textNodes.length === 0) return null;

    for (let i = 0; i < textNodes.length; i++) {
      const tNode = textNodes[i];
      range.selectNodeContents(tNode);
      const rect = range.getBoundingClientRect();
      if (rect.bottom > maxBottom && rect.top < maxBottom) {
        let low = 0;
        let high = tNode.data.length;
        let splitOffset = -1;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          range.setStart(tNode, 0);
          range.setEnd(tNode, mid);
          const rRect = range.getBoundingClientRect();
          if (rRect.bottom <= maxBottom) {
            splitOffset = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        if (splitOffset > 0 && splitOffset < tNode.data.length) {
          const textUpToSplit = tNode.data.slice(0, splitOffset);
          const lastSpace = textUpToSplit.lastIndexOf(' ');
          const finalSplit = lastSpace > splitOffset * 0.6 ? lastSpace + 1 : splitOffset;

          const secondPartText = tNode.data.slice(finalSplit);
          tNode.data = tNode.data.slice(0, finalSplit);

          const newEl = elChild.cloneNode(false) as HTMLElement;
          newEl.textContent = secondPartText;

          let nextSibling = tNode.nextSibling;
          while (nextSibling) {
            const toMove = nextSibling;
            nextSibling = nextSibling.nextSibling;
            newEl.appendChild(toMove);
          }

          return newEl;
        }
      }
    }

    return null;
  };

  // Repaginate overflowing pages starting from index startIdx
  const repaginateFrom = useCallback(
    (startIdx: number) => {
      if (isRepaginatingRef.current) return;
      isRepaginatingRef.current = true;

      try {
        let idx = startIdx;
        let didModify = false;

        while (idx < pagesContentRef.current.length) {
          const el = pageRefs.current[idx];
          if (!el) {
            idx++;
            continue;
          }

          if (el.scrollHeight <= el.clientHeight + 4 && getContentRemainingSpace(el) >= 0) {
            idx++;
            continue;
          }

          const containerRect = el.getBoundingClientRect();
          const maxBottom = containerRect.bottom - 4;

          const children = Array.from(el.childNodes);
          const nodesToMove: Node[] = [];
          let splitNodeToMove: Node | null = null;

          for (let cIdx = 0; cIdx < children.length; cIdx++) {
            const child = children[cIdx];
            if (child.nodeType === Node.ELEMENT_NODE) {
              const elChild = child as HTMLElement;
              const rect = elChild.getBoundingClientRect();

              if (rect.top >= maxBottom) {
                nodesToMove.push(...children.slice(cIdx));
                break;
              } else if (rect.bottom > maxBottom) {
                const splitResult = trySplitElement(elChild, maxBottom);
                if (splitResult) {
                  splitNodeToMove = splitResult;
                  nodesToMove.push(...children.slice(cIdx + 1));
                } else if (cIdx > 0) {
                  nodesToMove.push(...children.slice(cIdx));
                }
                break;
              }
            } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
              const range = document.createRange();
              range.selectNode(child);
              const rect = range.getBoundingClientRect();
              if (rect.bottom > maxBottom) {
                nodesToMove.push(...children.slice(cIdx));
                break;
              }
            }
          }

          if (nodesToMove.length === 0 && !splitNodeToMove) {
            idx++;
            continue;
          }

          didModify = true;

          nodesToMove.forEach((n) => {
            if (n.parentNode === el) {
              el.removeChild(n);
            }
          });

          const moveWrapper = document.createElement('div');
          if (splitNodeToMove) {
            moveWrapper.appendChild(splitNodeToMove);
          }
          nodesToMove.forEach((n) => moveWrapper.appendChild(n));
          const movedHtml = moveWrapper.innerHTML;

          pagesContentRef.current[idx] = el.innerHTML || '<p><br></p>';

          const nextIdx = idx + 1;
          if (nextIdx >= pagesContentRef.current.length) {
            pagesContentRef.current.push(movedHtml);
            const newTotal = pagesContentRef.current.length;
            setPageCount(newTotal);
            onTotalPagesChange?.(newTotal);
            setAnimatingPageIndex(nextIdx);
          } else {
            const nextEl = pageRefs.current[nextIdx];
            if (nextEl) {
              nextEl.innerHTML = movedHtml + nextEl.innerHTML;
              pagesContentRef.current[nextIdx] = nextEl.innerHTML;
            } else {
              pagesContentRef.current[nextIdx] =
                movedHtml + (pagesContentRef.current[nextIdx] || '');
            }
          }

          idx++;
        }

        if (didModify) {
          recordSnapshot();
        }
      } finally {
        isRepaginatingRef.current = false;
      }
    },
    [onTotalPagesChange, recordSnapshot],
  );

  // Transition to a newly created page smoothly with slide-out animation and scroll
  const createNewPageAndTransition = useCallback(
    (fromPageIndex: number) => {
      recordSnapshot();
      const nextIdx = fromPageIndex + 1;

      if (nextIdx < pagesContentRef.current.length) {
        setActivePageIndex(nextIdx);
        onPageChange?.(nextIdx + 1);
        setAnimatingPageIndex(nextIdx);

        const nextEl = pageRefs.current[nextIdx];
        if (nextEl) {
          placeCaretAtStart(nextEl);
          const sheet = nextEl.closest('[data-page-index]');
          sheet?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      const nextPages = [...pagesContentRef.current, '<p><br></p>'];
      pagesContentRef.current = nextPages;
      const newCount = nextPages.length;

      setPageCount(newCount);
      onTotalPagesChange?.(newCount);
      setActivePageIndex(nextIdx);
      onPageChange?.(nextIdx + 1);
      setAnimatingPageIndex(nextIdx);

      setTimeout(() => {
        const nextEl = pageRefs.current[nextIdx];
        if (nextEl) {
          nextEl.innerHTML = '<p><br></p>';
          nextEl.setAttribute('data-initialized', 'true');
          placeCaretAtStart(nextEl);
          const sheet = nextEl.closest('[data-page-index]');
          sheet?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        recordSnapshot(nextIdx);
      }, 40);
    },
    [onPageChange, onTotalPagesChange, recordSnapshot],
  );

  // Split paragraph when Enter is pressed at the bottom boundary of the page
  const splitParagraphToNextPage = useCallback(
    (pIdx: number, range: Range) => {
      recordSnapshot();
      const currentEl = pageRefs.current[pIdx];
      if (!currentEl) return;

      let blockNode: Node | null = range.startContainer;
      while (blockNode && blockNode.parentNode !== currentEl && blockNode !== currentEl) {
        blockNode = blockNode.parentNode;
      }

      const tailRange = document.createRange();
      tailRange.setStart(range.startContainer, range.startOffset);
      if (blockNode) {
        tailRange.setEndAfter(blockNode);
      } else {
        tailRange.setEndAfter(currentEl.lastChild || currentEl);
      }

      const extractedFrag = tailRange.extractContents();
      const trailingFragment = document.createDocumentFragment();
      trailingFragment.appendChild(extractedFrag);

      if (blockNode && blockNode.nextSibling) {
        let nextSib: Node | null = blockNode.nextSibling;
        while (nextSib) {
          const toMove = nextSib;
          nextSib = nextSib.nextSibling;
          trailingFragment.appendChild(toMove);
        }
      }

      const div = document.createElement('div');
      div.appendChild(trailingFragment);
      const movedHtml = div.innerHTML.trim() || '<p><br></p>';

      pagesContentRef.current[pIdx] = currentEl.innerHTML;

      const nextIdx = pIdx + 1;
      if (nextIdx < pagesContentRef.current.length) {
        const nextEl = pageRefs.current[nextIdx];
        if (nextEl) {
          nextEl.innerHTML = movedHtml + nextEl.innerHTML;
          pagesContentRef.current[nextIdx] = nextEl.innerHTML;
          setActivePageIndex(nextIdx);
          onPageChange?.(nextIdx + 1);
          setAnimatingPageIndex(nextIdx);
          placeCaretAtStart(nextEl);
          nextEl
            .closest('[data-page-index]')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        const nextPages = [...pagesContentRef.current, movedHtml];
        pagesContentRef.current = nextPages;
        const newCount = nextPages.length;
        setPageCount(newCount);
        onTotalPagesChange?.(newCount);
        setActivePageIndex(nextIdx);
        onPageChange?.(nextIdx + 1);
        setAnimatingPageIndex(nextIdx);

        setTimeout(() => {
          const nextEl = pageRefs.current[nextIdx];
          if (nextEl) {
            nextEl.innerHTML = movedHtml;
            nextEl.setAttribute('data-initialized', 'true');
            placeCaretAtStart(nextEl);
            nextEl
              .closest('[data-page-index]')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          recordSnapshot(nextIdx);
        }, 40);
      }
    },
    [onPageChange, onTotalPagesChange, recordSnapshot],
  );

  // Delete page
  const handleDeletePage = useCallback(
    (index: number) => {
      if (pagesContentRef.current.length <= 1) return;
      recordSnapshot();

      const nextPages = pagesContentRef.current.filter((_, idx) => idx !== index);
      pagesContentRef.current = nextPages;
      setPageCount(nextPages.length);
      onTotalPagesChange?.(nextPages.length);

      const newIdx = Math.max(0, index - 1);
      setActivePageIndex(newIdx);
      onPageChange?.(newIdx + 1);

      // Re-initialize remaining page contents to match updated array
      setTimeout(() => {
        nextPages.forEach((html, i) => {
          const el = pageRefs.current[i];
          if (el) {
            el.innerHTML = html;
          }
        });
        recordSnapshot(newIdx);
      }, 40);
    },
    [onPageChange, onTotalPagesChange, recordSnapshot],
  );

  // Keydown handler: handles Enter, Backspace, holding Enter
  const handlePageKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, pIdx: number) => {
      const currentEl = pageRefs.current[pIdx];
      if (!currentEl) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        const isAtEnd = isCaretAtEndOfElement(currentEl);
        const isFull = isElementVerticallyFull(currentEl, 26);

        if (isAtEnd && isFull) {
          // Bottom of page reached: prevent 3km stretching, slide out to new page!
          e.preventDefault();
          createNewPageAndTransition(pIdx);
          return;
        }

        // If page is genuinely full and caret is on the bottom line with text following
        if (isFull) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const caretRect = range.getBoundingClientRect();
            const contRect = currentEl.getBoundingClientRect();
            if (
              caretRect.bottom > 0 &&
              contRect.bottom > 0 &&
              caretRect.bottom >= contRect.bottom - 32
            ) {
              e.preventDefault();
              splitParagraphToNextPage(pIdx, range);
              return;
            }
          }
        }

        // Normal Enter when page still has space:
        // let browser insert standard paragraph on this page, then check if it causes actual overflow
        setTimeout(() => {
          if (
            currentEl.scrollHeight > currentEl.clientHeight + 4 ||
            getContentRemainingSpace(currentEl) < -2
          ) {
            repaginateFrom(pIdx);
          }
        }, 15);
        return;
      }

      if (e.key === 'Backspace') {
        if (pIdx > 0 && isCaretAtStartOfElement(currentEl)) {
          const isEmpty = isPageContentEmpty(currentEl);
          if (isEmpty) {
            e.preventDefault();
            handleDeletePage(pIdx);
            setTimeout(() => {
              const prevEl = pageRefs.current[pIdx - 1];
              if (prevEl) {
                placeCaretAtEnd(prevEl);
                prevEl
                  .closest('[data-page-index]')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 30);
            return;
          }
        }
      }
    },
    [createNewPageAndTransition, handleDeletePage, repaginateFrom, splitParagraphToNextPage],
  );

  // Paste handler: repaginates when large blocks of text are inserted
  const handlePagePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>, pIdx: number) => {
      setTimeout(() => {
        const el = pageRefs.current[pIdx];
        if (el) {
          pagesContentRef.current[pIdx] = el.innerHTML;
          if (el.scrollHeight > el.clientHeight + 4 || getContentRemainingSpace(el) < -2) {
            repaginateFrom(pIdx);
          }
          recordSnapshot();
        }
      }, 20);
    },
    [recordSnapshot, repaginateFrom],
  );

  // Update page HTML on typing / input
  const handlePageInput = useCallback(
    (index: number, html: string) => {
      pagesContentRef.current[index] = html;
      scheduleTypingSnapshot();

      const el = pageRefs.current[index];
      if (el && (el.scrollHeight > el.clientHeight + 4 || getContentRemainingSpace(el) < -2)) {
        repaginateFrom(index);
      }
    },
    [repaginateFrom, scheduleTypingSnapshot],
  );

  // Initial overflow check when document loads
  useEffect(() => {
    const timer = setTimeout(() => {
      for (let i = 0; i < pagesContentRef.current.length; i++) {
        const el = pageRefs.current[i];
        if (el && (el.scrollHeight > el.clientHeight + 6 || getContentRemainingSpace(el) < -4)) {
          repaginateFrom(i);
          break;
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [repaginateFrom]);

  // Export to DOCX
  const handleExport = async (action: 'save' | 'send' | 'download') => {
    setIsSaving(true);
    try {
      // Gather latest html from refs
      const updatedPages = pagesContentRef.current.map((p, idx) => {
        const el = pageRefs.current[idx];
        return el ? el.innerHTML : p;
      });

      const editedFile = await exportDocxToFile(
        updatedPages.map((html) => ({ html })),
        fileName,
      );

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
      console.error('Failed to export DOCX:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl flex flex-col items-center my-2">
      {/* 1. Word Ribbon Toolbar (Liquid Glass Style with Microsoft Word ergonomics) */}
      <div
        className="sticky top-2 z-30 w-full p-2 sm:px-3 rounded-2xl flex flex-wrap items-center justify-between gap-1.5 select-none mb-6 relative"
        style={{
          background:
            'linear-gradient(135deg, rgba(24, 26, 38, 0.88) 0%, rgba(14, 16, 26, 0.94) 100%)',
          backdropFilter: 'blur(30px) saturate(190%)',
          WebkitBackdropFilter: 'blur(30px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow:
            'inset 0 1px 1px 0 rgba(255, 255, 255, 0.25), 0 16px 36px -8px rgba(0, 0, 0, 0.65)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none rounded-t-2xl" />

        <div className="flex flex-wrap items-center gap-1">
          {/* Smart Undo / Redo */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-white/15">
            <button
              type="button"
              disabled={!canUndo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUndo}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer active:scale-95"
              title="Скасувати (Ctrl+Z)"
            >
              <Undo size={15} />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleRedo}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer active:scale-95"
              title="Повторити (Ctrl+Y)"
            >
              <Redo size={15} />
            </button>
          </div>

          {/* Font Family Dropdown */}
          <div className="relative" ref={fontFamilyRef}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsFontFamilyOpen((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-xs font-medium text-gray-200 transition-colors cursor-pointer"
              title="Шрифт"
            >
              <span className="truncate max-w-[100px]">{selectedFontFamily}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            {isFontFamilyOpen && (
              <div
                className="absolute top-full left-0 mt-1 py-1 rounded-xl shadow-2xl z-40 flex flex-col min-w-[160px] bg-[#1c1e2c] border border-white/15 backdrop-blur-xl"
                style={{
                  boxShadow:
                    '0 16px 36px -8px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)',
                }}
              >
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFontFamily(f.value, f.label)}
                    className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10 text-left cursor-pointer"
                    style={{ fontFamily: f.value }}
                  >
                    <span>{f.label}</span>
                    {selectedFontFamily === f.label && (
                      <Check size={12} className="text-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Size Dropdown */}
          <div className="relative" ref={fontSizeRef}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsFontSizeOpen((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-xs font-medium text-gray-200 transition-colors cursor-pointer"
              title="Розмір шрифту"
            >
              <span>{selectedFontSize.replace(' (Word)', '')}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            {isFontSizeOpen && (
              <div
                className="absolute top-full left-0 mt-1 py-1 rounded-xl shadow-2xl z-40 flex flex-col min-w-[130px] bg-[#1c1e2c] border border-white/15 backdrop-blur-xl"
                style={{
                  boxShadow:
                    '0 16px 36px -8px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)',
                }}
              >
                {FONT_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFontSize(s.value, s.label)}
                    className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10 text-left cursor-pointer"
                  >
                    <span>{s.label}</span>
                    {selectedFontSize === s.label && (
                      <Check size={12} className="text-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('formatBlock', '<p>')}
            className="px-1.5 py-1 rounded-lg hover:bg-white/10 text-gray-300 font-semibold text-[11px] transition-colors cursor-pointer"
            title="Звичайний текст (Paragraph)"
          >
            P
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('formatBlock', '<h1>')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Заголовок 1 (H1)"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('formatBlock', '<h2>')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Заголовок 2 (H2)"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('formatBlock', '<h3>')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Заголовок 3 (H3)"
          >
            <Heading3 size={16} />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Font styles (Bold, Italic, Underline, Strikethrough) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('bold')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Жирний (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('italic')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Курсив (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('underline')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Підкреслений (Ctrl+U)"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('strikeThrough')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Закреслений"
          >
            <Strikethrough size={15} />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* 1. Font Color (Word Style with active color bar) */}
          <div className="relative flex items-center" ref={textColorPickerRef}>
            <div className="flex items-center rounded-lg hover:bg-white/10 p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextColor(currentTextColor)}
                className="flex flex-col items-center justify-center px-1.5 py-0.5 cursor-pointer text-gray-200"
                title={`Колір тексту (${currentTextColor})`}
              >
                <span className="font-serif font-black text-sm leading-none">A</span>
                <span
                  className="w-4 h-1 rounded-sm mt-0.5 shadow-xs"
                  style={{ backgroundColor: currentTextColor }}
                />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTextColorPickerOpen((prev) => !prev);
                  setIsHighlightPickerOpen(false);
                }}
                className="p-1 hover:bg-white/15 rounded text-gray-400 hover:text-white cursor-pointer"
                title="Палітра кольорів тексту"
              >
                <ChevronDown size={11} />
              </button>
            </div>

            {isTextColorPickerOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-2 p-3 rounded-2xl shadow-2xl z-40 flex flex-col gap-2.5 min-w-[240px]"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(28, 30, 44, 0.98) 0%, rgba(16, 18, 28, 0.99) 100%)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  boxShadow:
                    '0 20px 40px -8px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)',
                }}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <Palette size={13} className="text-purple-400" />
                    <span>Колір тексту</span>
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyTextColor('#1e293b')}
                    className="text-[11px] text-gray-400 hover:text-purple-300 underline cursor-pointer"
                  >
                    Авто
                  </button>
                </div>

                {/* Theme Palette Matrix */}
                <div className="flex flex-col gap-1.5">
                  {WORD_THEME_COLORS.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-8 gap-1.5">
                      {row.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyTextColor(c)}
                          className={`w-5 h-5 rounded-md border border-white/20 hover:scale-125 transition-transform cursor-pointer shadow-xs relative ${
                            currentTextColor === c ? 'ring-2 ring-purple-400' : ''
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Custom Color Native Picker */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-gray-300 font-medium">Інший колір...</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="color"
                      value={currentTextColor}
                      onChange={(e) => applyTextColor(e.target.value)}
                      className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 2. Text Highlight / Marker Color (Word Style) */}
          <div className="relative flex items-center" ref={highlightPickerRef}>
            <div className="flex items-center rounded-lg hover:bg-white/10 p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyHighlightColor(currentHighlightColor)}
                className="flex flex-col items-center justify-center px-1.5 py-0.5 cursor-pointer text-gray-200"
                title={`Виділити маркером (${currentHighlightColor})`}
              >
                <Highlighter size={14} />
                <span
                  className="w-4 h-1 rounded-sm mt-0.5 shadow-xs"
                  style={{ backgroundColor: currentHighlightColor }}
                />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHighlightPickerOpen((prev) => !prev);
                  setIsTextColorPickerOpen(false);
                }}
                className="p-1 hover:bg-white/15 rounded text-gray-400 hover:text-white cursor-pointer"
                title="Палітра кольорів маркера"
              >
                <ChevronDown size={11} />
              </button>
            </div>

            {isHighlightPickerOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-2 p-3 rounded-2xl shadow-2xl z-40 flex flex-col gap-2.5 min-w-[200px]"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(28, 30, 44, 0.98) 0%, rgba(16, 18, 28, 0.99) 100%)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  boxShadow:
                    '0 20px 40px -8px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)',
                }}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <Highlighter size={13} className="text-yellow-400" />
                    <span>Виділення маркером</span>
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyHighlightColor('transparent')}
                    className="text-[11px] text-gray-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    Скинути
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-2 p-1">
                  {WORD_HIGHLIGHT_COLORS.map((h) => (
                    <button
                      key={h.color}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyHighlightColor(h.color)}
                      className={`w-6 h-6 rounded-md border border-white/30 hover:scale-125 transition-transform cursor-pointer shadow-xs ${
                        currentHighlightColor === h.color ? 'ring-2 ring-yellow-400' : ''
                      }`}
                      style={{ backgroundColor: h.color }}
                      title={h.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Microsoft Word Alignments */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyAlignment('left')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="За лівим краєм (Ctrl+L)"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyAlignment('center')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="По центру (Ctrl+E)"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyAlignment('right')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="За правим краєм (Ctrl+R)"
          >
            <AlignRight size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyAlignment('justify')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="По ширині сторінки (Ctrl+J)"
          >
            <AlignJustify size={15} />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Lists & Indentation */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('insertUnorderedList')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Маркований список"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('insertOrderedList')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Нумерований список"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('outdent')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Зменшити відступ"
          >
            <Outdent size={15} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('indent')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
            title="Збільшити відступ"
          >
            <Indent size={15} />
          </button>
        </div>

        {/* Right: Save / Send */}
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              type="button"
              disabled={isSaving}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleExport('save')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Зберегти документ"
            >
              <Save size={14} />
              <span>Зберегти</span>
            </button>
          )}

          {onSendDirectly && (
            <button
              type="button"
              disabled={isSaving}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleExport('send')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Надіслати у чат"
            >
              <Send size={13} />
              <span>Надіслати</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Keyframe Style for Fluid Slide-Out Animation */}
      <style>{`
        @keyframes docxSheetSlideOut {
          0% {
            opacity: 0;
            transform: translateY(32px) scale(0.985);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          60% {
            opacity: 0.95;
            transform: translateY(-2px) scale(1.002);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
          }
        }
        .animate-docx-slide-out {
          animation: docxSheetSlideOut 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 2. Paged A4 Sheets Container with top clearance */}
      <div className="flex flex-col items-center gap-8 w-full pb-16 pt-2 sm:pt-3">
        {Array.from({ length: pageCount }).map((_, pIdx) => (
          <div
            key={pIdx}
            data-page-index={pIdx}
            className={`relative w-full bg-white text-gray-900 rounded-xs shadow-[0_20px_60px_rgba(0,0,0,0.65)] border border-gray-300 select-text flex flex-col justify-between overflow-hidden transition-all duration-300 ${
              animatingPageIndex === pIdx ? 'animate-docx-slide-out' : ''
            }`}
            style={{
              width: `${docPageSettings.width}px`,
              maxWidth: '100%',
              height: `${docPageSettings.height}px`,
              minHeight: `${docPageSettings.height}px`,
              maxHeight: `${docPageSettings.height}px`,
              paddingTop: `${docPageSettings.marginTop}px`,
              paddingBottom: `${docPageSettings.marginBottom}px`,
              paddingLeft: `${docPageSettings.marginLeft}px`,
              paddingRight: `${docPageSettings.marginRight}px`,
              fontFamily: '"Times New Roman", Times, serif',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Sheet Header Indicator */}
            <div className="absolute top-3 right-5 flex items-center gap-2 text-gray-400 select-none text-[11px] font-sans z-10">
              <span>
                Сторінка {pIdx + 1} з {pageCount}
              </span>
              {pageCount > 1 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleDeletePage(pIdx)}
                  className="p-1 rounded hover:bg-rose-100 text-rose-500 transition-colors cursor-pointer"
                  title="Видалити цю сторінку"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Page Editable Body (Uncontrolled content avoids React caret destruction on Backspace/typing) */}
            <div
              ref={(el) => {
                pageRefs.current[pIdx] = el;
              }}
              data-doc-editable="true"
              contentEditable
              suppressContentEditableWarning
              onFocus={() => setActivePageIndex(pIdx)}
              onInput={(e) => handlePageInput(pIdx, e.currentTarget.innerHTML)}
              onKeyDown={(e) => handlePageKeyDown(e, pIdx)}
              onPaste={(e) => handlePagePaste(e, pIdx)}
              className="prose prose-slate max-w-none text-gray-800 leading-relaxed outline-none flex-1 min-h-0 overflow-hidden focus:ring-0 focus:outline-none"
              style={{
                fontSize: '16px',
                lineHeight: '1.6',
              }}
            />

            {/* Bottom Sheet Footer Page Number */}
            <div className="shrink-0 mt-2 pt-3 border-t border-gray-200/60 text-center text-xs text-gray-400 font-sans select-none pointer-events-none">
              - {pIdx + 1} -
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
