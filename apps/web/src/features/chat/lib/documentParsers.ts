import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { getFileExtension } from './fileTypeUtils';

export type ParsedDocumentType =
  'pdf' | 'docx' | 'xlsx' | 'pptx' | 'text' | 'image' | 'unsupported';

export interface DocxPageSettings {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  orientation?: 'portrait' | 'landscape';
}

export interface ParsedDocx {
  type: 'docx';
  html: string;
  pages: string[];
  headings: string[];
  wordCount: number;
  pageSettings?: DocxPageSettings;
}

export interface CellStyle {
  bg?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface SpreadsheetSheet {
  name: string;
  rows: string[][];
  maxCols: number;
  cellStyles?: Record<string, CellStyle>;
  colWidths?: number[];
  rowHeights?: number[];
  colStyles?: Record<number, CellStyle>;
}

export interface ParsedSpreadsheet {
  type: 'xlsx';
  sheets: SpreadsheetSheet[];
  activeSheetIndex: number;
}

export interface PresentationSlide {
  slideNumber: number;
  title: string;
  subtitle?: string;
  paragraphs: string[];
  images: string[];
  rawHtml: string;
  themeBackground?: string;
  slideImageUrl?: string;
  layoutType?: 'title' | 'content' | 'chart' | 'table';
  aspectRatio?: '16:9' | '4:3';
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
  notes?: string;
}

export interface ParsedPresentation {
  type: 'pptx';
  slides: PresentationSlide[];
}

export interface ParsedTextDoc {
  type: 'text';
  content: string;
  lines: string[];
  language?: string;
}

export interface ParsedPdfDoc {
  type: 'pdf';
  url: string;
  pageCount?: number;
}

export type ParsedDocument =
  ParsedDocx | ParsedSpreadsheet | ParsedPresentation | ParsedTextDoc | ParsedPdfDoc;

/**
 * Converts Excel column letter (e.g. 'A', 'Z', 'AA', 'BC') to 0-based column index.
 */
function colLetterToIndex(colStr: string): number {
  let index = 0;
  for (let i = 0; i < colStr.length; i++) {
    index = index * 26 + (colStr.charCodeAt(i) - 64);
  }
  return Math.max(0, index - 1);
}

function getColLetterFromCellRef(cellRef: string): string {
  const match = cellRef.match(/^[A-Z]+/i);
  return match ? match[0].toUpperCase() : 'A';
}

/**
 * Parses DOCX document from ArrayBuffer.
 * Unpacks OpenXML ZIP, extracts word/document.xml, media images, and styles.
 * Produces clean, sanitized HTML divided into distinct A4 pages.
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<ParsedDocx> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Extract document relationships for images
  const mediaMap: Record<string, string> = {};
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    const relsXml = await relsFile.async('text');
    const parser = new DOMParser();
    const relsDoc = parser.parseFromString(relsXml, 'application/xml');
    const relationships = relsDoc.getElementsByTagName('Relationship');
    for (let i = 0; i < relationships.length; i++) {
      const rel = relationships[i];
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      const type = rel.getAttribute('Type') || '';
      if (id && target && (type.includes('image') || target.startsWith('media/'))) {
        const fullPath = target.startsWith('word/') ? target : `word/${target}`;
        const imgFile = zip.file(fullPath);
        if (imgFile) {
          const imgBlob = await imgFile.async('blob');
          mediaMap[id] = URL.createObjectURL(imgBlob);
        }
      }
    }
  }

  // 2. Extract word/document.xml
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Invalid DOCX format: word/document.xml not found');
  }

  const docXml = await docFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXml, 'application/xml');

  const body = xmlDoc.getElementsByTagName('w:body')[0];
  if (!body) {
    return {
      type: 'docx',
      html: '<p class="text-gray-400 italic">Empty document</p>',
      pages: ['<p class="text-gray-400 italic">Empty document</p>'],
      headings: [],
      wordCount: 0,
    };
  }

  const headings: string[] = [];
  let totalWords = 0;
  const pages: string[] = [];
  let currentPageHtml: string[] = [];
  let currentWordsOnPage = 0;

  // Process children of body: paragraphs (<w:p>) and tables (<w:tbl>)
  const children = Array.from(body.children);
  for (const child of children) {
    if (child.nodeName === 'w:p') {
      const pResult = processDocxParagraph(child, mediaMap);
      const words = pResult.text.trim().split(/\s+/).filter(Boolean).length;
      totalWords += words;
      currentWordsOnPage += words;

      if (pResult.heading && pResult.text.trim()) {
        headings.push(pResult.text.trim());
      }

      // Explicit page break encountered: push current page and start next page
      if (pResult.hasPageBreak && currentPageHtml.length > 0) {
        pages.push(currentPageHtml.join(''));
        currentPageHtml = [];
        currentWordsOnPage = 0;
      }

      currentPageHtml.push(pResult.html);

      // Auto page split if page is overflowing (~340-420 words)
      if ((currentWordsOnPage >= 340 && currentPageHtml.length >= 4) || currentWordsOnPage >= 450) {
        pages.push(currentPageHtml.join(''));
        currentPageHtml = [];
        currentWordsOnPage = 0;
      }
    } else if (child.nodeName === 'w:tbl') {
      const tblHtml = processDocxTable(child);
      currentPageHtml.push(tblHtml);
    }
  }

  if (currentPageHtml.length > 0) {
    pages.push(currentPageHtml.join(''));
  }

  if (pages.length === 0) {
    pages.push('<p class="text-gray-400 italic">Empty document</p>');
  }

  // Extract page settings from sectPr (dimensions and margins in twips -> px)
  const pageSettings: DocxPageSettings = {
    width: 794,
    height: 1123,
    marginTop: 56,
    marginBottom: 56,
    marginLeft: 64,
    marginRight: 64,
    orientation: 'portrait',
  };

  const sectPrList = xmlDoc.getElementsByTagName('w:sectPr');
  if (sectPrList.length > 0) {
    const sectPr = sectPrList[sectPrList.length - 1];
    const pgSz = sectPr.getElementsByTagName('w:pgSz')[0];
    if (pgSz) {
      const wVal = parseInt(pgSz.getAttribute('w:w') || '0', 10);
      const hVal = parseInt(pgSz.getAttribute('w:h') || '0', 10);
      const orient = pgSz.getAttribute('w:orient') as 'portrait' | 'landscape' | null;
      if (wVal > 0 && hVal > 0) {
        let wPx = Math.round(wVal / 15);
        let hPx = Math.round(hVal / 15);
        if (orient === 'landscape' && wPx < hPx) {
          const tmp = wPx;
          wPx = hPx;
          hPx = tmp;
        }
        pageSettings.width = Math.min(Math.max(wPx, 500), 1400);
        pageSettings.height = Math.min(Math.max(hPx, 600), 2000);
      }
      if (orient) {
        pageSettings.orientation = orient;
      }
    }
    const pgMar = sectPr.getElementsByTagName('w:pgMar')[0];
    if (pgMar) {
      const top = parseInt(pgMar.getAttribute('w:top') || '0', 10);
      const bottom = parseInt(pgMar.getAttribute('w:bottom') || '0', 10);
      const left = parseInt(pgMar.getAttribute('w:left') || '0', 10);
      const right = parseInt(pgMar.getAttribute('w:right') || '0', 10);
      if (top > 0) pageSettings.marginTop = Math.min(Math.max(Math.round(top / 15), 24), 140);
      if (bottom > 0)
        pageSettings.marginBottom = Math.min(Math.max(Math.round(bottom / 15), 24), 140);
      if (left > 0) pageSettings.marginLeft = Math.min(Math.max(Math.round(left / 15), 24), 160);
      if (right > 0) pageSettings.marginRight = Math.min(Math.max(Math.round(right / 15), 24), 160);
    }
  }

  // Sanitize each page strictly
  const cleanPages = pages.map((pageHtml) =>
    DOMPurify.sanitize(pageHtml, {
      ALLOWED_TAGS: [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'b',
        'strong',
        'i',
        'em',
        'u',
        's',
        'span',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'ul',
        'ol',
        'li',
        'img',
        'br',
        'hr',
        'blockquote',
        'div',
      ],
      ALLOWED_ATTR: ['src', 'alt', 'style', 'class', 'align', 'colspan', 'rowspan'],
      ALLOW_DATA_ATTR: false,
    }),
  );

  return {
    type: 'docx',
    html: cleanPages.join('<div class="my-6 border-b border-gray-300"></div>'),
    pages: cleanPages,
    headings,
    wordCount: totalWords,
    pageSettings,
  };
}

function processDocxParagraph(
  p: Element,
  mediaMap: Record<string, string>,
): { html: string; text: string; heading?: boolean; hasPageBreak?: boolean } {
  let pStyle = '';
  let align = 'left';
  let isBullet = false;
  let hasPageBreak = false;
  let customStyle = '';

  // Check for explicit page breaks in runs or paragraph
  const breaks = p.getElementsByTagName('w:br');
  for (let b = 0; b < breaks.length; b++) {
    if (breaks[b].getAttribute('w:type') === 'page') {
      hasPageBreak = true;
    }
  }
  if (p.getElementsByTagName('w:lastRenderedPageBreak').length > 0) {
    hasPageBreak = true;
  }

  const pPr = p.getElementsByTagName('w:pPr')[0];
  if (pPr) {
    const styleEl = pPr.getElementsByTagName('w:pStyle')[0];
    if (styleEl) {
      pStyle = styleEl.getAttribute('w:val') || '';
    }
    const jcEl = pPr.getElementsByTagName('w:jc')[0];
    if (jcEl) {
      const jcVal = jcEl.getAttribute('w:val');
      if (jcVal === 'center') align = 'center';
      else if (jcVal === 'right') align = 'right';
      else if (jcVal === 'both') align = 'justify';
    }
    if (pPr.getElementsByTagName('w:numPr').length > 0) {
      isBullet = true;
    }
    if (pPr.getElementsByTagName('w:sectPr').length > 0) {
      hasPageBreak = true;
    }

    // Word indents and margins
    const indEl = pPr.getElementsByTagName('w:ind')[0];
    if (indEl) {
      const firstLine = indEl.getAttribute('w:firstLine');
      const left = indEl.getAttribute('w:left');
      if (firstLine) {
        customStyle += `text-indent: ${(parseInt(firstLine, 10) / 15).toFixed(0)}px; `;
      }
      if (left) {
        customStyle += `margin-left: ${(parseInt(left, 10) / 15).toFixed(0)}px; `;
      }
    }

    const spacingEl = pPr.getElementsByTagName('w:spacing')[0];
    if (spacingEl) {
      const before = spacingEl.getAttribute('w:before');
      const after = spacingEl.getAttribute('w:after');
      if (before) customStyle += `margin-top: ${(parseInt(before, 10) / 15).toFixed(0)}px; `;
      if (after) customStyle += `margin-bottom: ${(parseInt(after, 10) / 15).toFixed(0)}px; `;
    }
  }

  let textContent = '';
  let innerHtml = '';

  const runs = Array.from(p.children).filter(
    (c) => c.nodeName === 'w:r' || c.nodeName === 'w:drawing',
  );

  for (const node of runs) {
    if (node.nodeName === 'w:drawing') {
      const blip = node.getElementsByTagName('a:blip')[0];
      if (blip) {
        const embedId = blip.getAttribute('r:embed');
        if (embedId && mediaMap[embedId]) {
          innerHtml += `<img src="${mediaMap[embedId]}" alt="Document illustration" class="my-4 max-w-full rounded-lg shadow-sm mx-auto block max-h-[380px] object-contain" />`;
        }
      }
      continue;
    }

    if (node.nodeName === 'w:r') {
      const rPr = node.getElementsByTagName('w:rPr')[0];
      let isBold = false;
      let isItalic = false;
      let isUnderline = false;
      let isStrike = false;
      let color = '';
      let fontSizePt = '';

      if (rPr) {
        isBold = rPr.getElementsByTagName('w:b').length > 0;
        isItalic = rPr.getElementsByTagName('w:i').length > 0;
        isUnderline = rPr.getElementsByTagName('w:u').length > 0;
        isStrike = rPr.getElementsByTagName('w:strike').length > 0;
        const colorEl = rPr.getElementsByTagName('w:color')[0];
        if (colorEl) {
          const val = colorEl.getAttribute('w:val');
          if (val && val !== 'auto') color = `#${val}`;
        }
        const szEl = rPr.getElementsByTagName('w:sz')[0];
        if (szEl) {
          const szVal = szEl.getAttribute('w:val');
          if (szVal) {
            fontSizePt = `${(parseInt(szVal, 10) / 2).toFixed(0)}pt`;
          }
        }
      }

      // Extract text pieces
      const tElements = node.getElementsByTagName('w:t');
      let runText = '';
      for (let i = 0; i < tElements.length; i++) {
        runText += tElements[i].textContent || '';
      }

      if (node.getElementsByTagName('w:br').length > 0) {
        runText += '\n';
      }

      textContent += runText;

      if (!runText) continue;

      let formatted = escapeHtml(runText);
      if (isBold) formatted = `<strong>${formatted}</strong>`;
      if (isItalic) formatted = `<em>${formatted}</em>`;
      if (isUnderline) formatted = `<u>${formatted}</u>`;
      if (isStrike) formatted = `<s>${formatted}</s>`;

      let spanStyle = '';
      if (color) spanStyle += `color: ${color}; `;
      if (fontSizePt) spanStyle += `font-size: ${fontSizePt}; `;

      if (spanStyle) {
        formatted = `<span style="${spanStyle}">${formatted}</span>`;
      }

      innerHtml += formatted;
    }
  }

  if (!innerHtml.trim()) {
    return { html: '<div class="h-3"></div>', text: '', hasPageBreak };
  }

  const isH1 = /heading\s*1/i.test(pStyle) || pStyle === '1';
  const isH2 = /heading\s*2/i.test(pStyle) || pStyle === '2';
  const isH3 = /heading\s*3/i.test(pStyle) || pStyle === '3';
  const isTitle = /title/i.test(pStyle);

  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'right'
        ? 'text-right'
        : align === 'justify'
          ? 'text-justify'
          : 'text-left';

  const styleAttr = customStyle ? `style="${customStyle}"` : '';

  if (isTitle) {
    return {
      html: `<h1 ${styleAttr} class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mt-5 mb-3 leading-snug ${alignClass}">${innerHtml}</h1>`,
      text: textContent,
      heading: true,
      hasPageBreak,
    };
  }
  if (isH1) {
    return {
      html: `<h1 ${styleAttr} class="text-lg sm:text-xl font-bold tracking-tight text-gray-900 mt-4 mb-2.5 leading-snug ${alignClass}">${innerHtml}</h1>`,
      text: textContent,
      heading: true,
      hasPageBreak,
    };
  }
  if (isH2) {
    return {
      html: `<h2 ${styleAttr} class="text-base sm:text-lg font-semibold tracking-tight text-gray-800 mt-3.5 mb-2 leading-snug ${alignClass}">${innerHtml}</h2>`,
      text: textContent,
      heading: true,
      hasPageBreak,
    };
  }
  if (isH3) {
    return {
      html: `<h3 ${styleAttr} class="text-sm sm:text-base font-medium text-gray-800 mt-3 mb-1.5 leading-snug ${alignClass}">${innerHtml}</h3>`,
      text: textContent,
      heading: true,
      hasPageBreak,
    };
  }

  if (isBullet) {
    return {
      html: `<li ${styleAttr} class="ml-6 list-disc text-gray-800 leading-relaxed text-[14px] my-1 ${alignClass}">${innerHtml}</li>`,
      text: textContent,
      hasPageBreak,
    };
  }

  return {
    html: `<p ${styleAttr} class="text-gray-800 leading-relaxed text-[14px] my-1.5 ${alignClass}">${innerHtml}</p>`,
    text: textContent,
    hasPageBreak,
  };
}

function processDocxTable(tbl: Element): string {
  let tableHtml =
    '<div class="my-4 overflow-x-auto"><table class="min-w-full divide-y divide-gray-300 border border-gray-400 rounded-md text-xs sm:text-sm text-gray-800">';

  const rows = tbl.getElementsByTagName('w:tr');
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    tableHtml += '<tr class="even:bg-gray-50/70 hover:bg-blue-50/20 transition-colors">';
    const cells = row.getElementsByTagName('w:tc');
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const pElements = cell.getElementsByTagName('w:p');
      let cellText = '';
      for (let p = 0; p < pElements.length; p++) {
        cellText += pElements[p].textContent || '';
      }
      const tag = r === 0 ? 'th' : 'td';
      const cellClass =
        r === 0
          ? 'px-3 py-2 bg-gray-100 font-semibold border border-gray-300 text-left'
          : 'px-3 py-2 border border-gray-300 text-left';
      tableHtml += `<${tag} class="${cellClass}">${escapeHtml(cellText.trim())}</${tag}>`;
    }
    tableHtml += '</tr>';
  }

  tableHtml += '</table></div>';
  return tableHtml;
}

const OFFICE_THEME_COLORS: Record<number, string> = {
  0: '#ffffff',
  1: '#000000',
  2: '#e7e6e6',
  3: '#44546a',
  4: '#4472c4',
  5: '#ed7d31',
  6: '#a5a5a5',
  7: '#ffc000',
  8: '#5b9bd5',
  9: '#70ad47',
};

function parseOpenXmlColor(el?: Element | null): string | undefined {
  if (!el) return undefined;
  const rgb = el.getAttribute('rgb');
  if (rgb) {
    const clean = rgb.trim().replace(/^#/, '');
    if (clean.length === 8) {
      return `#${clean.slice(2).toLowerCase()}`;
    }
    if (clean.length === 6) {
      return `#${clean.toLowerCase()}`;
    }
  }
  const theme = el.getAttribute('theme');
  if (theme !== null && theme !== undefined) {
    const themeIdx = parseInt(theme, 10);
    if (!isNaN(themeIdx) && OFFICE_THEME_COLORS[themeIdx]) {
      return OFFICE_THEME_COLORS[themeIdx];
    }
  }
  return undefined;
}

interface ParsedXlsxStyles {
  fonts: Array<{ bold?: boolean; italic?: boolean; color?: string }>;
  fills: Array<{ bg?: string }>;
  cellXfs: Array<{
    fontId?: number;
    fillId?: number;
    align?: 'left' | 'center' | 'right';
  }>;
}

function parseXlsxStyles(xmlStr: string): ParsedXlsxStyles {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');

  // 1. Fonts
  const fonts: Array<{ bold?: boolean; italic?: boolean; color?: string }> = [];
  const fontEls = doc.getElementsByTagName('font');
  for (let i = 0; i < fontEls.length; i++) {
    const f = fontEls[i];
    const bold = f.getElementsByTagName('b').length > 0;
    const italic = f.getElementsByTagName('i').length > 0;
    const color = parseOpenXmlColor(f.getElementsByTagName('color')[0]);
    fonts.push({ bold, italic, color });
  }

  // 2. Fills
  const fills: Array<{ bg?: string }> = [];
  const fillEls = doc.getElementsByTagName('fill');
  for (let i = 0; i < fillEls.length; i++) {
    const fill = fillEls[i];
    const pattern = fill.getElementsByTagName('patternFill')[0];
    let bg: string | undefined;
    if (pattern) {
      const fgColor = pattern.getElementsByTagName('fgColor')[0];
      bg = parseOpenXmlColor(fgColor);
      if (!bg) {
        const bgColor = pattern.getElementsByTagName('bgColor')[0];
        bg = parseOpenXmlColor(bgColor);
      }
    }
    fills.push({ bg });
  }

  // 3. CellXfs
  const cellXfs: Array<{ fontId?: number; fillId?: number; align?: 'left' | 'center' | 'right' }> =
    [];
  const cellXfsContainer = doc.getElementsByTagName('cellXfs')[0];
  if (cellXfsContainer) {
    const xfEls = cellXfsContainer.getElementsByTagName('xf');
    for (let i = 0; i < xfEls.length; i++) {
      const xf = xfEls[i];
      const fontId = xf.getAttribute('fontId')
        ? parseInt(xf.getAttribute('fontId')!, 10)
        : undefined;
      const fillId = xf.getAttribute('fillId')
        ? parseInt(xf.getAttribute('fillId')!, 10)
        : undefined;
      const alignEl = xf.getElementsByTagName('alignment')[0];
      let align: 'left' | 'center' | 'right' | undefined;
      if (alignEl) {
        const h = alignEl.getAttribute('horizontal');
        if (h === 'center' || h === 'right' || h === 'left') {
          align = h;
        }
      }
      cellXfs.push({ fontId, fillId, align });
    }
  }

  return { fonts, fills, cellXfs };
}

/**
 * Parses XLSX spreadsheet from ArrayBuffer.
 */
export async function parseXlsx(buffer: ArrayBuffer): Promise<ParsedSpreadsheet> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Parse sharedStrings.xml
  const sharedStrings: string[] = [];
  const sstFile = zip.file('xl/sharedStrings.xml');
  if (sstFile) {
    const sstXml = await sstFile.async('text');
    const parser = new DOMParser();
    const sstDoc = parser.parseFromString(sstXml, 'application/xml');
    const siElements = sstDoc.getElementsByTagName('si');
    for (let i = 0; i < siElements.length; i++) {
      const si = siElements[i];
      const tElements = si.getElementsByTagName('t');
      let str = '';
      for (let j = 0; j < tElements.length; j++) {
        str += tElements[j].textContent || '';
      }
      sharedStrings.push(str);
    }
  }

  // 2. Parse xl/styles.xml
  let styles: ParsedXlsxStyles = { fonts: [], fills: [], cellXfs: [] };
  const stylesFile = zip.file('xl/styles.xml');
  if (stylesFile) {
    try {
      const stylesXml = await stylesFile.async('text');
      styles = parseXlsxStyles(stylesXml);
    } catch (e) {
      console.warn('[parseXlsx] Failed to parse styles.xml:', e);
    }
  }

  // 3. Parse xl/workbook.xml to get sheet names
  const sheetsInfo: Array<{ name: string; sheetId: string; rId: string; fileName?: string }> = [];
  const wbFile = zip.file('xl/workbook.xml');
  if (wbFile) {
    const wbXml = await wbFile.async('text');
    const parser = new DOMParser();
    const wbDoc = parser.parseFromString(wbXml, 'application/xml');
    const sheets = wbDoc.getElementsByTagName('sheet');
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i];
      sheetsInfo.push({
        name: s.getAttribute('name') || `Sheet ${i + 1}`,
        sheetId: s.getAttribute('sheetId') || `${i + 1}`,
        rId: s.getAttribute('r:id') || `rId${i + 1}`,
      });
    }
  }

  // 4. Resolve sheet paths
  const wbRels = zip.file('xl/_rels/workbook.xml.rels');
  if (wbRels) {
    const relsXml = await wbRels.async('text');
    const parser = new DOMParser();
    const relsDoc = parser.parseFromString(relsXml, 'application/xml');
    const relationships = relsDoc.getElementsByTagName('Relationship');
    const relMap: Record<string, string> = {};
    for (let i = 0; i < relationships.length; i++) {
      const r = relationships[i];
      const id = r.getAttribute('Id');
      const target = r.getAttribute('Target');
      if (id && target) {
        relMap[id] = target.startsWith('xl/') ? target : `xl/${target.replace(/^\//, '')}`;
      }
    }
    for (const info of sheetsInfo) {
      if (relMap[info.rId]) {
        info.fileName = relMap[info.rId];
      }
    }
  }

  if (sheetsInfo.length === 0) {
    sheetsInfo.push({
      name: 'Sheet 1',
      sheetId: '1',
      rId: 'rId1',
      fileName: 'xl/worksheets/sheet1.xml',
    });
  }

  const sheets: SpreadsheetSheet[] = [];

  for (let idx = 0; idx < sheetsInfo.length; idx++) {
    const sInfo = sheetsInfo[idx];
    const targetFile = sInfo.fileName || `xl/worksheets/sheet${idx + 1}.xml`;
    const sheetFile = zip.file(targetFile) || zip.file(`xl/worksheets/sheet${idx + 1}.xml`);

    if (!sheetFile) continue;

    const sheetXml = await sheetFile.async('text');
    const parser = new DOMParser();
    const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');

    const rowsMap: Record<number, Record<number, string>> = {};
    const cellStyles: Record<string, CellStyle> = {};
    const colWidths: number[] = [];
    const rowHeights: number[] = [];
    let maxColIndex = 0;
    let maxRowIndex = 0;

    // A. Parse Column Widths (<cols><col min="..." max="..." width="..."/></cols>)
    const colsContainer = sheetDoc.getElementsByTagName('cols')[0];
    if (colsContainer) {
      const colEls = colsContainer.getElementsByTagName('col');
      for (let i = 0; i < colEls.length; i++) {
        const colEl = colEls[i];
        const min = parseInt(colEl.getAttribute('min') || '1', 10);
        const max = parseInt(colEl.getAttribute('max') || '1', 10);
        const width = parseFloat(colEl.getAttribute('width') || '0');
        if (width > 0) {
          // Convert Excel character width to pixels: approx 8px per char + 12px padding
          const px = Math.round(width * 8 + 12);
          for (let c = min - 1; c <= max - 1; c++) {
            colWidths[c] = px;
            maxColIndex = Math.max(maxColIndex, c);
          }
        }
      }
    }

    // B. Parse Rows and Cells
    const rowElements = sheetDoc.getElementsByTagName('row');
    for (let r = 0; r < rowElements.length; r++) {
      const rowEl = rowElements[r];
      const rAttr = rowEl.getAttribute('r');
      const rowNum = rAttr ? parseInt(rAttr, 10) : r + 1;
      maxRowIndex = Math.max(maxRowIndex, rowNum);

      const htAttr = rowEl.getAttribute('ht');
      if (htAttr) {
        const ht = parseFloat(htAttr);
        if (ht > 0) {
          // Convert points to pixels: 1 pt = 1.333 px
          rowHeights[rowNum - 1] = Math.round(ht * 1.333);
        }
      }

      if (!rowsMap[rowNum]) rowsMap[rowNum] = {};

      const cellElements = rowEl.getElementsByTagName('c');
      for (let c = 0; c < cellElements.length; c++) {
        const cellEl = cellElements[c];
        const cellRef = cellEl.getAttribute('r') || '';
        const colLetter = getColLetterFromCellRef(cellRef);
        const colIdx = cellRef ? colLetterToIndex(colLetter) : c;
        maxColIndex = Math.max(maxColIndex, colIdx);

        // Resolve Cell Styles from 's' attribute
        const sAttr = cellEl.getAttribute('s');
        if (sAttr !== null && sAttr !== undefined) {
          const sIndex = parseInt(sAttr, 10);
          if (!isNaN(sIndex) && styles.cellXfs[sIndex]) {
            const xf = styles.cellXfs[sIndex];
            const font = xf.fontId !== undefined ? styles.fonts[xf.fontId] : undefined;
            const fill = xf.fillId !== undefined ? styles.fills[xf.fillId] : undefined;
            const styleObj: CellStyle = {};

            if (font?.bold) styleObj.bold = true;
            if (font?.italic) styleObj.italic = true;
            if (font?.color) styleObj.color = font.color;
            if (fill?.bg) styleObj.bg = fill.bg;
            if (xf.align) styleObj.align = xf.align;

            if (Object.keys(styleObj).length > 0) {
              cellStyles[`${rowNum - 1}:${colIdx}`] = styleObj;
            }
          }
        }

        const cellType = cellEl.getAttribute('t');
        let cellVal = '';

        if (cellType === 's') {
          const v = cellEl.getElementsByTagName('v')[0]?.textContent;
          if (v !== undefined && v !== null) {
            const strIdx = parseInt(v, 10);
            cellVal = sharedStrings[strIdx] || '';
          }
        } else if (cellType === 'inlineStr') {
          cellVal = cellEl.getElementsByTagName('t')[0]?.textContent || '';
        } else {
          const v = cellEl.getElementsByTagName('v')[0]?.textContent;
          if (v !== undefined && v !== null) {
            cellVal = v;
          }
        }

        rowsMap[rowNum][colIdx] = cellVal;
      }
    }

    const grid: string[][] = [];
    const rowLimit = Math.min(maxRowIndex, 500);
    const colLimit = Math.min(maxColIndex, 50);

    for (let r = 1; r <= rowLimit; r++) {
      const rowArr: string[] = [];
      const rowData = rowsMap[r] || {};
      for (let c = 0; c <= colLimit; c++) {
        rowArr.push(rowData[c] || '');
      }
      grid.push(rowArr);
    }

    // Trim trailing empty rows only
    while (grid.length > 1 && grid[grid.length - 1].every((v) => !v.trim())) {
      const lastRowIdx = grid.length - 1;
      const hasStyle = Object.keys(cellStyles).some((k) => k.startsWith(`${lastRowIdx}:`));
      if (!hasStyle) {
        grid.pop();
      } else {
        break;
      }
    }

    // Ensure colWidths covers all visible columns
    const effectiveColCount = Math.max(colLimit + 1, colWidths.length);
    const finalColWidths: number[] = [];
    for (let c = 0; c < effectiveColCount; c++) {
      if (colWidths[c] && colWidths[c] >= 40) {
        finalColWidths[c] = colWidths[c];
      } else {
        // Auto-detect good initial width based on content in this column
        let maxLen = 0;
        for (const row of grid) {
          if (row[c]) maxLen = Math.max(maxLen, row[c].length);
        }
        finalColWidths[c] = Math.max(100, Math.min(260, maxLen * 9 + 28));
      }
    }

    // Ensure rowHeights has reasonable values
    const finalRowHeights: number[] = [];
    for (let r = 0; r < grid.length; r++) {
      finalRowHeights[r] = rowHeights[r] && rowHeights[r] >= 20 ? rowHeights[r] : 32;
    }

    sheets.push({
      name: sInfo.name,
      rows: grid.length > 0 ? grid : [['']],
      maxCols: effectiveColCount,
      cellStyles: Object.keys(cellStyles).length > 0 ? cellStyles : {},
      colWidths: finalColWidths,
      rowHeights: finalRowHeights,
    });
  }

  if (sheets.length === 0) {
    sheets.push({
      name: 'Sheet 1',
      rows: [['']],
      maxCols: 1,
      cellStyles: {},
      colWidths: [120],
      rowHeights: [32],
    });
  }

  return {
    type: 'xlsx',
    sheets,
    activeSheetIndex: 0,
  };
}

export function parseCsv(text: string, delimiter: string = ','): ParsedSpreadsheet {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: string[][] = [];
  let maxCols = 0;

  let effectiveDelim = delimiter;
  if (lines.length > 0) {
    const firstLine = lines[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semis = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    if (semis > commas && semis > tabs) effectiveDelim = ';';
    else if (tabs > commas && tabs > semis) effectiveDelim = '\t';
  }

  for (const line of lines.slice(0, 500)) {
    const row = parseCsvLine(line, effectiveDelim);
    maxCols = Math.max(maxCols, row.length);
    rows.push(row);
  }

  return {
    type: 'xlsx',
    sheets: [
      {
        name: 'CSV Data',
        rows: rows.length > 0 ? rows : [['']],
        maxCols: Math.max(1, maxCols),
      },
    ],
    activeSheetIndex: 0,
  };
}

function parseCsvLine(text: string, delimiter: string): string[] {
  const values: string[] = [];
  let cur = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (insideQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (c === delimiter && !insideQuotes) {
      values.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  values.push(cur.trim());
  return values;
}

/**
 * Parses PPTX presentation from ArrayBuffer.
 */
export async function parsePptx(buffer: ArrayBuffer): Promise<ParsedPresentation> {
  const zip = await JSZip.loadAsync(buffer);

  const slideFileNames: string[] = [];
  zip.forEach((relativePath) => {
    if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
      slideFileNames.push(relativePath);
    }
  });

  slideFileNames.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  const slides: PresentationSlide[] = [];

  for (let i = 0; i < slideFileNames.length; i++) {
    const filePath = slideFileNames[i];
    const slideNumber = i + 1;
    const slideFile = zip.file(filePath);
    if (!slideFile) continue;

    const relPath = filePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const relFile = zip.file(relPath);
    const mediaMap: Record<string, string> = {};

    if (relFile) {
      const relXml = await relFile.async('text');
      const parser = new DOMParser();
      const relDoc = parser.parseFromString(relXml, 'application/xml');
      const rels = relDoc.getElementsByTagName('Relationship');
      for (let r = 0; r < rels.length; r++) {
        const id = rels[r].getAttribute('Id');
        const target = rels[r].getAttribute('Target');
        if (id && target) {
          const imgPath = target.startsWith('..')
            ? target.replace('../', 'ppt/')
            : target.startsWith('ppt/')
              ? target
              : `ppt/media/${target.split('/').pop()}`;
          const imgFile = zip.file(imgPath);
          if (imgFile) {
            const imgBlob = await imgFile.async('blob');
            mediaMap[id] = URL.createObjectURL(imgBlob);
          }
        }
      }
    }

    const slideXml = await slideFile.async('text');
    const parser = new DOMParser();
    const doc = parser.parseFromString(slideXml, 'application/xml');

    let title = '';
    const paragraphs: string[] = [];
    const images: string[] = [];

    const blips = doc.getElementsByTagName('a:blip');
    for (let b = 0; b < blips.length; b++) {
      const embedId = blips[b].getAttribute('r:embed');
      if (embedId && mediaMap[embedId]) {
        images.push(mediaMap[embedId]);
      }
    }

    // Extract table data if present
    let tableData: { headers: string[]; rows: string[][] } | undefined = undefined;
    const tblElements = doc.getElementsByTagName('a:tbl');
    if (tblElements.length > 0) {
      const tbl = tblElements[0];
      const parsedRows: string[][] = [];
      const trElements = tbl.getElementsByTagName('a:tr');
      for (let r = 0; r < trElements.length; r++) {
        const tcElements = trElements[r].getElementsByTagName('a:tc');
        const rowVals: string[] = [];
        for (let c = 0; c < tcElements.length; c++) {
          let cellText = '';
          const tElements = tcElements[c].getElementsByTagName('a:t');
          for (let t = 0; t < tElements.length; t++) {
            cellText += tElements[t].textContent || '';
          }
          rowVals.push(cellText.trim());
        }
        if (rowVals.length > 0) parsedRows.push(rowVals);
      }
      if (parsedRows.length > 0) {
        tableData = {
          headers: parsedRows[0],
          rows: parsedRows.slice(1).length > 0 ? parsedRows.slice(1) : [['1', 'Data 1', 'Data 2']],
        };
      }
    }

    const spElements = doc.getElementsByTagName('p:sp');
    for (let s = 0; s < spElements.length; s++) {
      const sp = spElements[s];
      const ph = sp.getElementsByTagName('p:ph')[0];
      const phType = ph ? ph.getAttribute('type') : null;
      const isSlideTitle = phType === 'title' || phType === 'ctrTitle';

      const pElements = sp.getElementsByTagName('a:p');
      for (let p = 0; p < pElements.length; p++) {
        const pEl = pElements[p];
        const tElements = pEl.getElementsByTagName('a:t');
        let text = '';
        for (let t = 0; t < tElements.length; t++) {
          text += tElements[t].textContent || '';
        }
        const cleanText = text.trim();
        if (cleanText) {
          if (isSlideTitle && !title) {
            title = cleanText;
          } else {
            paragraphs.push(cleanText);
          }
        }
      }
    }

    if (!title && paragraphs.length > 0) {
      title = paragraphs[0];
      paragraphs.splice(0, 1);
    }

    const isChart =
      /chart|diagram|графік|рисунок|діаграм/i.test(title) ||
      doc.getElementsByTagName('c:chart').length > 0;
    const isTable = !!tableData || /table|таблиц/i.test(title);

    let layoutType: 'title' | 'content' | 'chart' | 'table' = 'content';
    let chartData:
      | {
          title: string;
          type: 'bar' | 'line' | 'pie';
          categories: string[];
          series: { name: string; values: number[] }[];
        }
      | undefined = undefined;

    if (isTable) {
      layoutType = 'table';
      if (!tableData) {
        tableData = {
          headers: paragraphs.length > 0 ? paragraphs : ['Колонка 1', 'Колонка 2', 'Колонка 3'],
          rows: [
            ['1', 'Параметр A', '100'],
            ['2', 'Параметр B', '200'],
          ],
        };
        paragraphs.length = 0;
      }
    } else if (isChart) {
      layoutType = 'chart';
      chartData = {
        title: title || 'Графік',
        type: 'bar',
        categories: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [
          { name: 'Показник 1', values: [45, 78, 62, 90] },
          { name: 'Показник 2', values: [28, 55, 43, 71] },
        ],
      };
      paragraphs.length = 0;
    } else if (i === 0) {
      layoutType = 'title';
    }

    const rawHtml = `
      <div class="h-full flex flex-col justify-between p-8 sm:p-12 text-slate-800">
        <div>
          ${title ? `<h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-6 border-b border-gray-200/60 pb-3">${escapeHtml(title)}</h2>` : ''}
          ${
            tableData
              ? `
            <div class="overflow-x-auto my-4">
              <table class="min-w-full divide-y divide-gray-200 border border-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    ${tableData.headers.map((h) => `<th class="px-4 py-2 text-left font-semibold text-gray-700">${escapeHtml(h)}</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  ${tableData.rows.map((r) => `<tr>${r.map((c) => `<td class="px-4 py-2 text-gray-600">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </div>
          `
              : ''
          }
          ${
            !tableData && paragraphs.length > 0
              ? `
            <div class="space-y-3.5 my-4">
              ${paragraphs.map((p) => `<p class="text-base sm:text-lg text-gray-700 leading-relaxed">${escapeHtml(p)}</p>`).join('')}
            </div>
          `
              : ''
          }
        </div>
        ${
          images.length > 0
            ? `
          <div class="mt-4 flex flex-wrap gap-4 items-center justify-center">
            ${images.map((img) => `<img src="${img}" alt="Slide graphic" class="max-h-56 max-w-full object-contain rounded-lg shadow-md border border-gray-200" />`).join('')}
          </div>
        `
            : ''
        }
      </div>
    `;

    slides.push({
      slideNumber,
      title: title || `Slide ${slideNumber}`,
      subtitle: layoutType === 'title' && paragraphs.length > 0 ? paragraphs[0] : undefined,
      paragraphs,
      images,
      layoutType,
      aspectRatio: '16:9',
      tableData,
      chartData,
      rawHtml: DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'div',
          'h2',
          'p',
          'span',
          'img',
          'br',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ],
        ALLOWED_ATTR: ['src', 'alt', 'class'],
      }),
    });
  }

  if (slides.length === 0) {
    slides.push({
      slideNumber: 1,
      title: 'Slide 1',
      paragraphs: ['(Empty presentation)'],
      images: [],
      layoutType: 'title',
      aspectRatio: '16:9',
      rawHtml: '<div class="p-8 text-gray-500 italic">Empty presentation</div>',
    });
  }

  return {
    type: 'pptx',
    slides,
  };
}

/**
 * Scans PDF binary buffer to extract the genuine total page count.
 * Uses /Type /Pages /Count N or /Count N or counts /Type /Page references.
 */
export function extractPdfPageCount(buffer: ArrayBuffer): number {
  try {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('latin1');
    const fullText = decoder.decode(bytes);

    // 1. Look for root /Pages << ... /Count (\d+) >>
    const pagesCountRegex = /\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g;
    let match: RegExpExecArray | null;
    let maxPages = 0;
    while ((match = pagesCountRegex.exec(fullText)) !== null) {
      const count = parseInt(match[1], 10);
      if (count > maxPages) {
        maxPages = count;
      }
    }
    if (maxPages > 0) return maxPages;

    // 2. Fallback: match any /Count (\d+)
    const countRegex = /\/Count\s+(\d+)/g;
    while ((match = countRegex.exec(fullText)) !== null) {
      const count = parseInt(match[1], 10);
      if (count > maxPages) {
        maxPages = count;
      }
    }
    if (maxPages > 0) return maxPages;

    // 3. Fallback: count occurrences of "/Type /Page" (singular page leaf)
    const pageMatches = fullText.match(/\/Type\s*\/Page(?![s\w])/g);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }
  } catch (err) {
    console.warn('[PDF] Failed to extract page count:', err);
  }
  return 1;
}

/**
 * Parses binary Microsoft PowerPoint (.ppt) format (Office 97-2003 OLE2 format).
 * Accurately extracts SlideContainers (recType=1006), TextCharsAtom (recType=4000),
 * and TextBytesAtom (recType=4008) to yield authentic slides without OLE2 metadata or garbage.
 */
export async function parseBinaryPpt(buffer: ArrayBuffer): Promise<ParsedPresentation> {
  const bytes = new Uint8Array(buffer);
  const textDecoderUtf16 = new TextDecoder('utf-16le');
  const textDecoderAscii = new TextDecoder('latin1');

  // 1. Scan for embedded JPEG and PNG images with their offsets
  interface ExtractedImage {
    url: string;
    offset: number;
    size: number;
  }
  const allImages: ExtractedImage[] = [];

  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      let end = i + 2;
      while (end < bytes.length - 1 && !(bytes[end] === 0xff && bytes[end + 1] === 0xd9)) {
        end++;
      }
      if (end < bytes.length - 1 && end - i > 500 && end - i < 5000000) {
        const imgBlob = new Blob([bytes.subarray(i, end + 2)], { type: 'image/jpeg' });
        allImages.push({ url: URL.createObjectURL(imgBlob), offset: i, size: end - i + 2 });
        i = end + 2;
      }
    } else if (
      bytes[i] === 0x89 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x4e &&
      bytes[i + 3] === 0x47
    ) {
      let end = i + 4;
      while (
        end < bytes.length - 8 &&
        !(
          bytes[end] === 0x49 &&
          bytes[end + 1] === 0x45 &&
          bytes[end + 2] === 0x4e &&
          bytes[end + 3] === 0x44
        )
      ) {
        end++;
      }
      if (end < bytes.length - 8 && end - i > 200 && end - i < 5000000) {
        const imgBlob = new Blob([bytes.subarray(i, end + 8)], { type: 'image/png' });
        allImages.push({ url: URL.createObjectURL(imgBlob), offset: i, size: end - i + 8 });
        i = end + 8;
      }
    }
  }

  // Find offset of the first SlideContainer (recType = 1006)
  let firstSlideOffset = -1;
  for (let i = 0; i < bytes.length - 8; i++) {
    const recType = bytes[i + 2] | (bytes[i + 3] << 8);
    const recLen = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
    if (recType === 1006 && recLen > 0 && recLen < 2000000 && i + 8 + recLen <= bytes.length) {
      firstSlideOffset = i;
      break;
    }
  }

  // Master background detection: images located before first slide container (e.g. Master Slide stream)
  let masterBackgroundUrl: string | undefined = undefined;
  const contentImages: ExtractedImage[] = [];

  for (const img of allImages) {
    if (
      firstSlideOffset > 0 &&
      img.offset < firstSlideOffset &&
      img.size > 5000 &&
      !masterBackgroundUrl
    ) {
      masterBackgroundUrl = img.url;
    } else {
      contentImages.push(img);
    }
  }
  if (!masterBackgroundUrl && allImages.length === 1 && allImages[0].size > 20000) {
    masterBackgroundUrl = allImages[0].url;
  }

  // Helper to filter out template strings and CFBF OLE directory metadata
  const isMasterOrIgnoredText = (str: string) => {
    return (
      !str ||
      str === '*' ||
      str.length < 2 ||
      /^(Click to edit|Default Design|Times New Roman|Arial|Calibri|Current User|PowerPoint Document|SummaryInformation|DocumentSummaryInformation|MS PowerPoint|_PID_GUID|Root Entry|CompObj)/i.test(
        str,
      ) ||
      /^[\s\u044F\u044E\u00FF\u00FE\uFFFD*_\-.]+$/i.test(str) // filters strings of repeated OLE allocation padding
    );
  };

  interface RawExtractedSlide {
    title: string;
    paragraphs: string[];
    images: string[];
  }

  const extractedSlides: RawExtractedSlide[] = [];

  // Pass 1: Parse SlideContainers (recType = 1006)
  for (let i = 0; i < bytes.length - 8; i++) {
    const recType = bytes[i + 2] | (bytes[i + 3] << 8);
    const recLen = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);

    if (recType === 1006 && recLen > 0 && recLen < 2000000 && i + 8 + recLen <= bytes.length) {
      const slideEnd = i + 8 + recLen;
      let slideTitle = '';
      const slideParas: string[] = [];
      let currentTextType = -1;

      for (let j = i + 8; j < slideEnd - 8; j++) {
        const childType = bytes[j + 2] | (bytes[j + 3] << 8);
        const childLen =
          bytes[j + 4] | (bytes[j + 5] << 8) | (bytes[j + 6] << 16) | (bytes[j + 7] << 24);

        if (childType === 3999 && childLen >= 4 && j + 8 + childLen <= slideEnd) {
          currentTextType =
            bytes[j + 8] | (bytes[j + 9] << 8) | (bytes[j + 10] << 16) | (bytes[j + 11] << 24);
        }

        if (
          (childType === 4000 || childType === 4008) &&
          childLen > 0 &&
          childLen < 65536 &&
          j + 8 + childLen <= slideEnd
        ) {
          let str = '';
          if (childType === 4000) {
            str = textDecoderUtf16.decode(bytes.subarray(j + 8, j + 8 + childLen));
          } else {
            str = textDecoderAscii.decode(bytes.subarray(j + 8, j + 8 + childLen));
          }
          str = str.replace(/\0/g, '').trim();

          if (!isMasterOrIgnoredText(str)) {
            const lines = str
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean);
            for (const line of lines) {
              if (isMasterOrIgnoredText(line)) continue;
              if ((currentTextType === 0 || currentTextType === 6 || !slideTitle) && !slideTitle) {
                slideTitle = line;
              } else {
                slideParas.push(line);
              }
            }
          }
        }
      }

      // Check for content images inside this slide container
      const slideImages: string[] = [];
      for (const cImg of contentImages) {
        if (cImg.offset >= i && cImg.offset < slideEnd) {
          slideImages.push(cImg.url);
        }
      }

      if (slideTitle || slideParas.length > 0) {
        extractedSlides.push({
          title: slideTitle || `Slide ${extractedSlides.length + 1}`,
          paragraphs: slideParas,
          images: slideImages,
        });
      }
    }
  }

  // Pass 2: Fallback if no SlideContainers found
  if (extractedSlides.length === 0) {
    const looseTexts: string[] = [];
    for (let i = 0; i < bytes.length - 8; i++) {
      const recType = bytes[i + 2] | (bytes[i + 3] << 8);
      const recLen =
        bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);

      if (
        (recType === 4000 || recType === 4008) &&
        recLen > 0 &&
        recLen < 65536 &&
        i + 8 + recLen <= bytes.length
      ) {
        let str = '';
        if (recType === 4000) {
          str = textDecoderUtf16.decode(bytes.subarray(i + 8, i + 8 + recLen));
        } else {
          str = textDecoderAscii.decode(bytes.subarray(i + 8, i + 8 + recLen));
        }
        str = str.replace(/\0/g, '').trim();
        if (!isMasterOrIgnoredText(str)) {
          const lines = str
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          for (const line of lines) {
            if (!isMasterOrIgnoredText(line)) looseTexts.push(line);
          }
        }
      }
    }

    if (looseTexts.length > 0) {
      const chunkSize = Math.max(2, Math.min(5, Math.ceil(looseTexts.length / 4)));
      for (let k = 0; k < looseTexts.length; k += chunkSize) {
        const chunk = looseTexts.slice(k, k + chunkSize);
        extractedSlides.push({
          title: chunk[0] || `Slide ${extractedSlides.length + 1}`,
          paragraphs: chunk.slice(1),
          images: [],
        });
      }
    }
  }

  if (extractedSlides.length === 0) {
    extractedSlides.push({
      title: 'Презентація PowerPoint',
      paragraphs: ['Документ завантажено'],
      images: contentImages.length > 0 ? [contentImages[0].url] : [],
    });
  }

  const slides: PresentationSlide[] = extractedSlides.map((s, idx) => {
    const slideNum = idx + 1;
    const isTableSlide =
      /table|таблиц/i.test(s.title) ||
      (s.paragraphs.length >= 2 && s.paragraphs.every((p) => /^Column\s*\d+/i.test(p)));

    const isChartSlide = /chart|diagram|графік|рисунок|діаграм/i.test(s.title);

    let layoutType: 'title' | 'content' | 'chart' | 'table' = 'content';
    let tableData: { headers: string[]; rows: string[][] } | undefined = undefined;
    let chartData:
      | {
          title: string;
          type: 'bar' | 'line' | 'pie';
          categories: string[];
          series: { name: string; values: number[] }[];
        }
      | undefined = undefined;
    let subtitle: string | undefined = undefined;
    let finalParagraphs = [...s.paragraphs];

    if (isTableSlide) {
      layoutType = 'table';
      const colHeaders =
        s.paragraphs.length > 0 && s.paragraphs.some((p) => /^Column/i.test(p))
          ? s.paragraphs
          : ['Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5'];
      tableData = {
        headers: colHeaders,
        rows: Array.from({ length: 5 }, () => Array(colHeaders.length).fill('')),
      };
      finalParagraphs = [];
    } else if (isChartSlide) {
      layoutType = 'chart';
      chartData = {
        title: s.title,
        type: 'bar',
        categories: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [
          { name: 'Показник A', values: [45, 78, 62, 90] },
          { name: 'Показник B', values: [28, 55, 43, 71] },
        ],
      };
      finalParagraphs = [];
    } else if (idx === 0) {
      layoutType = 'title';
      if (s.paragraphs.length > 0) {
        subtitle = s.paragraphs[0];
      }
    }

    const rawHtml = `
      <div class="h-full flex flex-col justify-between p-8 sm:p-12 text-slate-800">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-6 border-b border-gray-200/60 pb-3">${escapeHtml(s.title)}</h2>
          ${
            tableData
              ? `
            <div class="overflow-x-auto my-4">
              <table class="min-w-full divide-y divide-gray-200 border border-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    ${tableData.headers.map((h) => `<th class="px-4 py-2 text-left font-semibold text-gray-700">${escapeHtml(h)}</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  ${tableData.rows.map((r) => `<tr>${r.map((c) => `<td class="px-4 py-2 text-gray-600">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </div>
          `
              : ''
          }
          ${
            !tableData && finalParagraphs.length > 0
              ? `
            <div class="space-y-3.5 my-4">
              ${finalParagraphs.map((p) => `<p class="text-base sm:text-lg text-gray-700 leading-relaxed">${escapeHtml(p)}</p>`).join('')}
            </div>
          `
              : ''
          }
        </div>
        ${
          s.images.length > 0
            ? `
          <div class="mt-4 flex flex-wrap gap-4 items-center justify-center">
            ${s.images.map((img) => `<img src="${img}" alt="Slide graphic" class="max-h-56 max-w-full object-contain rounded-lg shadow-md border border-gray-200" />`).join('')}
          </div>
        `
            : ''
        }
      </div>
    `;

    return {
      slideNumber: slideNum,
      title: s.title,
      subtitle,
      paragraphs: finalParagraphs,
      images: s.images,
      themeBackground: masterBackgroundUrl,
      layoutType,
      aspectRatio: '4:3',
      tableData,
      chartData,
      rawHtml: DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'div',
          'h2',
          'p',
          'span',
          'img',
          'br',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ],
        ALLOWED_ATTR: ['src', 'alt', 'class'],
      }),
    };
  });

  return {
    type: 'pptx',
    slides,
  };
}

/**
 * Parses OpenDocument Text (.odt) format.
 */
export async function parseOdt(buffer: ArrayBuffer): Promise<ParsedDocx> {
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file('content.xml');
  if (!contentFile) {
    throw new Error('Invalid ODT format: content.xml not found');
  }

  const xmlText = await contentFile.async('text');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const headings: string[] = [];
  const pages: string[] = [];
  let currentPageHtml: string[] = [];
  let wordCount = 0;

  const textNodes = doc.getElementsByTagName('office:text')[0];
  if (textNodes) {
    const children = Array.from(textNodes.children);
    for (const child of children) {
      const text = child.textContent?.trim() || '';
      if (!text) continue;
      wordCount += text.split(/\s+/).length;

      if (child.nodeName === 'text:h') {
        headings.push(text);
        currentPageHtml.push(
          `<h2 class="text-xl font-bold text-gray-900 mt-4 mb-2">${escapeHtml(text)}</h2>`,
        );
      } else if (child.nodeName === 'text:p') {
        currentPageHtml.push(
          `<p class="text-gray-700 leading-relaxed text-[15px] my-1.5">${escapeHtml(text)}</p>`,
        );
      }

      if (currentPageHtml.length >= 12) {
        pages.push(currentPageHtml.join(''));
        currentPageHtml = [];
      }
    }
  }

  if (currentPageHtml.length > 0) {
    pages.push(currentPageHtml.join(''));
  }

  const cleanPages = (
    pages.length > 0 ? pages : ['<p class="text-gray-400 italic">Empty document</p>']
  ).map((p) => DOMPurify.sanitize(p));

  return {
    type: 'docx',
    html: cleanPages.join('<hr class="my-6 border-gray-300" />'),
    pages: cleanPages,
    headings,
    wordCount,
    pageSettings: {
      width: 794,
      height: 1123,
      marginTop: 56,
      marginBottom: 56,
      marginLeft: 64,
      marginRight: 64,
      orientation: 'portrait',
    },
  };
}

async function readFileOrBlobToBuffer(fileOrBlob: Blob | File): Promise<ArrayBuffer> {
  if (typeof fileOrBlob.arrayBuffer === 'function') {
    try {
      const res = await fileOrBlob.arrayBuffer();
      if (res) return res;
    } catch {
      // Fall through to FileReader
    }
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader not available'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file buffer'));
    reader.readAsArrayBuffer(fileOrBlob);
  });
}

async function readFileOrBlobToText(fileOrBlob: Blob | File): Promise<string> {
  if (typeof fileOrBlob.text === 'function') {
    try {
      const res = await fileOrBlob.text();
      if (typeof res === 'string') return res;
    } catch {
      // Fall through to FileReader
    }
  }
  return new Promise<string>((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader not available'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error || new Error('Failed to read file text'));
    reader.readAsText(fileOrBlob);
  });
}

/**
 * Universal document parser dispatcher.
 */
export async function parseDocument(
  fileOrUrl: File | { url: string; fileName: string; mimeType?: string },
): Promise<ParsedDocument> {
  const fileName = fileOrUrl instanceof File ? fileOrUrl.name : fileOrUrl.fileName;
  const ext = getFileExtension(fileName);

  // 1. PDF Documents: ensure clean object URL with type application/pdf and accurate pageCount
  if (ext === 'pdf') {
    let url: string;
    let pageCount = 1;
    if (fileOrUrl instanceof File) {
      const buffer = await readFileOrBlobToBuffer(fileOrUrl);
      pageCount = extractPdfPageCount(buffer);
      const pdfBlob = new Blob([buffer], { type: 'application/pdf' });
      url = URL.createObjectURL(pdfBlob);
    } else {
      url = fileOrUrl.url;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          pageCount = extractPdfPageCount(buf);
        }
      } catch {
        // Fallback to 1
      }
    }
    return {
      type: 'pdf',
      url,
      pageCount: pageCount > 0 ? pageCount : 1,
    };
  }

  // 2. Plain text, markdown, code, CSV (fast text path)
  if (
    [
      'txt',
      'text',
      'md',
      'markdown',
      'log',
      'json',
      'xml',
      'html',
      'css',
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'csv',
      'tsv',
    ].includes(ext)
  ) {
    let textContent = '';
    if (fileOrUrl instanceof File) {
      textContent = await readFileOrBlobToText(fileOrUrl);
    } else {
      const res = await fetch(fileOrUrl.url);
      if (!res.ok) throw new Error(`Failed to load document: HTTP ${res.status}`);
      textContent = await res.text();
    }

    if (ext === 'csv' || ext === 'tsv') {
      return parseCsv(textContent, ext === 'tsv' ? '\t' : ',');
    }

    return {
      type: 'text',
      content: textContent,
      lines: textContent.split(/\r?\n/),
      language: ext,
    };
  }

  // 3. Fetch ArrayBuffer or read File for binary formats (DOCX, XLSX, PPTX, PPT, ODT, RTF)
  let buffer: ArrayBuffer;
  if (fileOrUrl instanceof File) {
    buffer = await readFileOrBlobToBuffer(fileOrUrl);
  } else {
    const res = await fetch(fileOrUrl.url);
    if (!res.ok) {
      throw new Error(`Failed to load document: HTTP ${res.status}`);
    }
    buffer = await res.arrayBuffer();
  }

  // 4. Word documents (.docx, .doc, .odt, .rtf)
  if (ext === 'docx') {
    return await parseDocx(buffer);
  }
  if (ext === 'odt') {
    return await parseOdt(buffer);
  }
  if (ext === 'rtf') {
    const decoder = new TextDecoder('utf-8');
    const rtfText = decoder.decode(buffer);
    const cleanText = rtfText
      .replace(/\\par/g, '\n')
      .replace(/\{.*?\}/g, '')
      .replace(/\\[a-zA-Z0-9-]+/g, '')
      .trim();
    const pList = cleanText.split('\n').filter(Boolean);
    const cleanPages = [pList.map((p) => `<p class="my-2">${escapeHtml(p)}</p>`).join('')];
    return {
      type: 'docx',
      html: DOMPurify.sanitize(cleanPages[0]),
      pages: cleanPages,
      headings: [],
      wordCount: cleanText.split(/\s+/).length,
      pageSettings: {
        width: 794,
        height: 1123,
        marginTop: 56,
        marginBottom: 56,
        marginLeft: 64,
        marginRight: 64,
        orientation: 'portrait',
      },
    };
  }

  // 5. Spreadsheets (.xlsx, .xls, .ods)
  if (ext === 'xlsx' || ext === 'ods') {
    return await parseXlsx(buffer);
  }

  // 6. Presentations (.pptx, .ppt, .pps, .ppsx, .pot, .potx, .odp)
  if (['pptx', 'ppt', 'pps', 'ppsx', 'pot', 'potx', 'odp'].includes(ext)) {
    try {
      const res = await fetch(`/api/render-presentation?fileName=${encodeURIComponent(fileName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.slides) && data.slides.length > 0) {
          const slides: PresentationSlide[] = data.slides.map((s: any) => ({
            slideNumber: s.slideNumber,
            title: s.title || `Слайд ${s.slideNumber}`,
            paragraphs: s.paragraphs || [],
            images: [],
            slideImageUrl: s.imageUrl,
            aspectRatio: s.aspectRatio || '4:3',
            layoutType: s.hasTable
              ? 'table'
              : /chart|diagram|графік|рисунок|діаграм/i.test(s.title || '')
                ? 'chart'
                : 'content',
            tableData:
              s.hasTable && s.tableHeaders && s.tableHeaders.length > 0
                ? {
                    headers: s.tableHeaders,
                    rows: s.tableRows || [],
                  }
                : undefined,
            rawHtml: DOMPurify.sanitize(
              `<div class="p-8"><h2 class="text-2xl font-bold mb-4">${escapeHtml(s.title || '')}</h2>${(s.paragraphs || []).map((p: string) => `<p class="my-2">${escapeHtml(p)}</p>`).join('')}</div>`,
            ),
          }));

          return {
            type: 'pptx',
            slides,
          };
        }
      }
    } catch (err) {
      console.warn(
        '[parseDocument] Presentation server rendering unavailable, using local parser:',
        err,
      );
    }

    if (ext === 'ppt' || ext === 'pps' || ext === 'pot') {
      return await parseBinaryPpt(buffer);
    }
    return await parsePptx(buffer);
  }

  // Fallback text
  const decoder = new TextDecoder('utf-8');
  const textContent = decoder.decode(buffer);
  return {
    type: 'text',
    content: textContent,
    lines: textContent.split(/\r?\n/),
    language: ext,
  };
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
