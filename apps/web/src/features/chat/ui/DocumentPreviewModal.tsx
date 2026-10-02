import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Save,
  Send,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import FileIconBadge from './FileIconBadge';
import SpreadsheetEditor from './documentEditors/SpreadsheetEditor';
import PresentationEditor from './documentEditors/PresentationEditor';
import WordDocumentEditor from './documentEditors/WordDocumentEditor';
import { getFileTypeMeta, getFileExtension } from '../lib/fileTypeUtils';
import {
  parseDocument,
  ParsedDocument,
  ParsedSpreadsheet,
  ParsedPresentation,
  ParsedDocx,
  ParsedTextDoc,
  ParsedPdfDoc,
} from '../lib/documentParsers';
import { formatFileSize } from '@/shared/lib/attachmentLimits';

export interface DocumentPreviewModalProps {
  fileOrUrl: File | { url: string; fileName: string; mimeType?: string; size?: number };
  onClose: () => void;
  onSave?: (editedFile: File) => void;
  onSendDirectly?: (editedFile: File) => void;
}

export default function DocumentPreviewModal({
  fileOrUrl,
  onClose,
  onSave,
  onSendDirectly,
}: DocumentPreviewModalProps) {
  const fileName = fileOrUrl instanceof File ? fileOrUrl.name : fileOrUrl.fileName;
  const mimeType = fileOrUrl instanceof File ? fileOrUrl.type : fileOrUrl.mimeType;
  const fileSize = fileOrUrl instanceof File ? fileOrUrl.size : fileOrUrl.size;
  const meta = getFileTypeMeta(fileName, mimeType);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docData, setDocData] = useState<ParsedDocument | null>(null);

  // Viewer state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handlePageInputCommit = () => {
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setCurrentPage(num);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Safe download URL
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (fileOrUrl instanceof File) {
      createdUrl = URL.createObjectURL(fileOrUrl);
      setDownloadUrl(createdUrl);
    } else {
      setDownloadUrl(fileOrUrl.url);
    }

    setIsLoading(true);
    setError(null);

    parseDocument(fileOrUrl)
      .then((parsed) => {
        if (!active) return;
        setDocData(parsed);
        setIsLoading(false);

        if (parsed.type === 'pptx') {
          setTotalPages(parsed.slides.length || 1);
        } else if (parsed.type === 'docx') {
          setTotalPages(parsed.pages?.length || 1);
        } else if (parsed.type === 'xlsx') {
          setTotalPages(parsed.sheets?.length || 1);
        } else if (parsed.type === 'pdf') {
          setTotalPages(parsed.pageCount || 1);
        } else {
          setTotalPages(1);
        }
        setCurrentPage(1);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[DocumentPreviewModal] Parse error:', err);
        setError(err.message || 'Failed to preview this document format.');
        setIsLoading(false);
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [fileOrUrl]);

  // Strict Escape key capture listener (Telegram standard): closes modal only, stops all bubbling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)));
  const handleZoomReset = () => setZoom(1);

  // Print handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Download handler
  const handleDownload = useCallback(
    (customFile?: File) => {
      if (customFile) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(customFile);
        link.download = customFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      if (!downloadUrl) return;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [downloadUrl, fileName],
  );

  const handleCopyText = useCallback(() => {
    if (docData?.type === 'text') {
      navigator.clipboard.writeText(docData.content).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  }, [docData]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-modal-open="true"
      data-lightbox-open="true"
      className="fixed inset-0 z-[100] flex flex-col bg-[#14151f]/95 dark:bg-[#0f1017]/98 backdrop-blur-2xl text-white select-none overflow-hidden animate-fadeIn duration-150"
    >
      {/* 1. Header Toolbar */}
      <header className="shrink-0 h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-[#181926]/90 backdrop-blur-xl z-20">
        {/* Left: Close button + File Icon + Filename */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
            title="Close (Esc)"
            aria-label="Close document preview"
          >
            <X size={20} />
          </button>

          <div className="shrink-0">
            <FileIconBadge fileName={fileName} mimeType={mimeType} size="sm" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-white truncate max-w-[260px] sm:max-w-md md:max-w-lg lg:max-w-xl">
              {fileName}
            </h1>
            {fileSize !== undefined && (
              <p className="text-xs text-gray-400 leading-none mt-0.5">
                {formatFileSize(fileSize)}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {docData?.type === 'text' && (
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all active:scale-95 cursor-pointer"
              title="Copy text"
            >
              {isCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Print document"
            aria-label="Print document"
          >
            <Printer size={19} />
          </button>

          <button
            type="button"
            onClick={() => handleDownload()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Download file"
            aria-label="Download file"
          >
            <Download size={19} />
          </button>
        </div>
      </header>

      {/* 2. Main Document Canvas Viewport */}
      <main className="relative flex-1 min-h-0 w-full overflow-auto custom-scrollbar flex items-start justify-center p-2 sm:p-5 md:p-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center my-auto">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 animate-spin text-purple-500" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-300">
              Завантаження та верифікація документа...
            </p>
            <p className="text-xs text-gray-500">
              Безпечний парсинг безпосередньо у вашому браузері
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full max-w-md p-6 text-center my-auto bg-white/5 border border-white/10 rounded-2xl">
            <AlertCircle size={44} className="text-rose-400 mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Cannot Preview Document</h3>
            <p className="text-xs text-gray-300 mb-5 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => handleDownload()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Download size={15} />
              <span>Download file ({fileName})</span>
            </button>
          </div>
        )}

        {docData && !isLoading && (
          <div
            className="transition-transform duration-150 origin-top flex justify-center w-full min-h-full"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* 2.1 PDF Document Viewer */}
            {docData.type === 'pdf' && (
              <div className="w-full max-w-5xl h-[84vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-white/20">
                <object
                  key={`pdf-${currentPage}`}
                  id="preview-pdf-object"
                  data={`${docData.url}#page=${currentPage}&toolbar=1&navpanes=1`}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <iframe
                    src={`${docData.url}#page=${currentPage}&toolbar=1&navpanes=1`}
                    title={fileName}
                    className="w-full h-full border-none"
                  />
                </object>
              </div>
            )}

            {/* 2.2 Word / Rich Text Multi-Page Editor (A4 Sheets) */}
            {docData.type === 'docx' && (
              <WordDocumentEditor
                initialPages={
                  docData.pages && docData.pages.length > 0 ? docData.pages : [docData.html]
                }
                fileName={fileName}
                pageSettings={docData.pageSettings}
                currentPage={currentPage}
                onPageChange={(p) => setCurrentPage(p)}
                onTotalPagesChange={(t) => setTotalPages(t)}
                onSave={onSave}
                onSendDirectly={onSendDirectly}
                onDownload={handleDownload}
              />
            )}

            {/* 2.3 Excel / Spreadsheet Editor */}
            {docData.type === 'xlsx' && (
              <SpreadsheetEditor
                initialSheets={docData.sheets}
                fileName={fileName}
                currentPage={currentPage}
                onPageChange={(p) => setCurrentPage(p)}
                onTotalPagesChange={(t) => setTotalPages(t)}
                onSave={onSave}
                onSendDirectly={onSendDirectly}
                onDownload={handleDownload}
              />
            )}

            {/* 2.4 PowerPoint Presentation Editor */}
            {docData.type === 'pptx' && (
              <PresentationEditor
                initialSlides={docData.slides}
                fileName={fileName}
                originalFile={fileOrUrl instanceof File ? fileOrUrl : undefined}
                currentPage={currentPage}
                onPageChange={(p) => setCurrentPage(p)}
                onTotalPagesChange={(t) => setTotalPages(t)}
                onSave={onSave}
                onSendDirectly={onSendDirectly}
                onDownload={handleDownload}
              />
            )}

            {/* 2.5 Plain Text & Code */}
            {docData.type === 'text' && (
              <div className="w-full max-w-4xl bg-[#1e1e2e] text-[#cdd6f4] rounded-2xl shadow-2xl border border-white/10 overflow-hidden my-2 select-text font-mono text-xs sm:text-sm">
                <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>{docData.lines.length} lines</span>
                  <span>UTF-8</span>
                </div>
                <div className="p-4 sm:p-6 overflow-x-auto max-h-[74vh] custom-scrollbar flex gap-4 leading-relaxed">
                  <div className="text-gray-500 select-none text-right font-mono pr-3 border-r border-white/10 shrink-0">
                    {docData.lines.map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <pre className="font-mono whitespace-pre text-gray-200">{docData.content}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Bottom Floating Pill Bar (Liquid Glass Style) */}
      <footer className="shrink-0 pointer-events-none pb-5 pt-1 px-4 flex justify-center z-30">
        <div
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-white shadow-2xl text-xs sm:text-sm select-none transition-all hover:scale-[1.02] border border-white/20"
          style={{
            background:
              'linear-gradient(135deg, rgba(28, 30, 44, 0.84) 0%, rgba(16, 18, 28, 0.92) 100%)',
            backdropFilter: 'blur(30px) saturate(200%)',
            WebkitBackdropFilter: 'blur(30px) saturate(200%)',
            boxShadow:
              'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.35), 0 16px 40px -8px rgba(0, 0, 0, 0.75)',
          }}
        >
          {/* Page / Slide / Sheet Navigation & Counter: [ < ] [ Label ] [ Current ] / [ Total ] [ > ] */}
          <div className="flex items-center gap-1.5 font-medium pr-2 border-r border-white/15">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={handlePrevPage}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/15 text-gray-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer active:scale-95"
              title="Попередня сторінка"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>

            <span className="text-gray-300">
              {docData?.type === 'pptx' ? 'Слайд' : docData?.type === 'xlsx' ? 'Аркуш' : 'Сторінка'}
            </span>

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageInputCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePageInputCommit();
                }}
                className="w-9 sm:w-11 text-center py-0.5 rounded-md bg-white/10 text-white font-semibold outline-none focus:ring-1 focus:ring-purple-400 text-xs sm:text-sm"
                aria-label="Поточна сторінка"
                title="Введіть номер сторінки"
              />
              <span className="text-gray-400 font-normal">/</span>
              <span className="px-1.5 py-0.5 rounded-md text-white font-semibold">
                {totalPages}
              </span>
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={handleNextPage}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/15 text-gray-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer active:scale-95"
              title="Наступна сторінка"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Zoom Controls: Minus, Reset, Plus */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/15 text-gray-200 hover:text-white transition-colors cursor-pointer active:scale-95"
              title="Zoom out (−)"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>

            <button
              type="button"
              onClick={handleZoomReset}
              className="px-2 py-0.5 rounded-full hover:bg-white/15 text-gray-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              title="Reset zoom (100%)"
              aria-label="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/15 text-gray-200 hover:text-white transition-colors cursor-pointer active:scale-95"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
