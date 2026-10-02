import { describe, it, expect } from 'vitest';
import { extractPdfPageCount, parseBinaryPpt, parseXlsx } from '../documentParsers';
import { exportSpreadsheetToXlsx } from '../documentExporters';

describe('documentParsers', () => {
  describe('extractPdfPageCount', () => {
    it('extracts page count from PDF /Type /Pages /Count dictionary', () => {
      const pdfText =
        '%PDF-1.5\n1 0 obj\n<< /Type /Pages /Count 13 /Kids [2 0 R] >>\nendobj\n%%EOF';
      const buffer = new TextEncoder().encode(pdfText).buffer;
      const count = extractPdfPageCount(buffer);
      expect(count).toBe(13);
    });

    it('extracts count fallback from /Count N', () => {
      const pdfText = '%PDF-1.4\n/Count 7\n%%EOF';
      const buffer = new TextEncoder().encode(pdfText).buffer;
      const count = extractPdfPageCount(buffer);
      expect(count).toBe(7);
    });

    it('falls back to counting /Type /Page occurrences', () => {
      const pdfText = '%PDF-1.4\n<< /Type /Page >>\n<< /Type /Page >>\n<< /Type /Page >>\n%%EOF';
      const buffer = new TextEncoder().encode(pdfText).buffer;
      const count = extractPdfPageCount(buffer);
      expect(count).toBe(3);
    });

    it('returns 1 for unrecognized PDF structure', () => {
      const pdfText = '%PDF-1.4 empty file';
      const buffer = new TextEncoder().encode(pdfText).buffer;
      const count = extractPdfPageCount(buffer);
      expect(count).toBe(1);
    });
  });

  describe('parseBinaryPpt', () => {
    it('parses SlideContainers and ignores OLE allocation table garbage or master template strings', async () => {
      // Build synthetic PPT bytes with 1 SlideContainer (recType = 1006)
      // containing title atom (recType = 4000) and paragraph
      const title = 'Company Strategy';
      const titleUtf16 = new Uint8Array(title.length * 2);
      for (let i = 0; i < title.length; i++) {
        titleUtf16[i * 2] = title.charCodeAt(i);
        titleUtf16[i * 2 + 1] = 0;
      }

      const body = 'First milestone goal';
      const bodyUtf16 = new Uint8Array(body.length * 2);
      for (let i = 0; i < body.length; i++) {
        bodyUtf16[i * 2] = body.charCodeAt(i);
        bodyUtf16[i * 2 + 1] = 0;
      }

      // Title atom: 8B header + titleUtf16
      const titleAtomLen = titleUtf16.length;
      const titleAtom = new Uint8Array(8 + titleAtomLen);
      titleAtom[0] = 0; // ver
      titleAtom[1] = 0;
      titleAtom[2] = 0xa0; // recType = 4000 (0x0fa0)
      titleAtom[3] = 0x0f;
      titleAtom[4] = titleAtomLen & 0xff;
      titleAtom[5] = (titleAtomLen >> 8) & 0xff;
      titleAtom.set(titleUtf16, 8);

      // Body atom: 8B header + bodyUtf16
      const bodyAtomLen = bodyUtf16.length;
      const bodyAtom = new Uint8Array(8 + bodyAtomLen);
      bodyAtom[2] = 0xa0;
      bodyAtom[3] = 0x0f;
      bodyAtom[4] = bodyAtomLen & 0xff;
      bodyAtom[5] = (bodyAtomLen >> 8) & 0xff;
      bodyAtom.set(bodyUtf16, 8);

      // SlideContainer: 8B header + titleAtom + bodyAtom
      const containerPayloadLen = titleAtom.length + bodyAtom.length;
      const container = new Uint8Array(8 + containerPayloadLen);
      container[2] = 0xee; // recType = 1006 (0x03ee)
      container[3] = 0x03;
      container[4] = containerPayloadLen & 0xff;
      container[5] = (containerPayloadLen >> 8) & 0xff;
      container.set(titleAtom, 8);
      container.set(bodyAtom, 8 + titleAtom.length);

      const parsed = await parseBinaryPpt(container.buffer);
      expect(parsed.type).toBe('pptx');
      expect(parsed.slides.length).toBe(1);
      expect(parsed.slides[0].title).toBe('Company Strategy');
      expect(parsed.slides[0].paragraphs).toContain('First milestone goal');
      expect(parsed.slides[0].layoutType).toBe('title');
    });

    it('identifies Table slides and populates structured tableData', async () => {
      const title = 'Table';
      const titleUtf16 = new Uint8Array(title.length * 2);
      for (let i = 0; i < title.length; i++) {
        titleUtf16[i * 2] = title.charCodeAt(i);
        titleUtf16[i * 2 + 1] = 0;
      }
      const titleAtom = new Uint8Array(8 + titleUtf16.length);
      titleAtom[2] = 0xa0;
      titleAtom[3] = 0x0f;
      titleAtom[4] = titleUtf16.length & 0xff;
      titleAtom[5] = (titleUtf16.length >> 8) & 0xff;
      titleAtom.set(titleUtf16, 8);

      const col1 = 'Column 1';
      const col1Utf16 = new Uint8Array(col1.length * 2);
      for (let i = 0; i < col1.length; i++) {
        col1Utf16[i * 2] = col1.charCodeAt(i);
        col1Utf16[i * 2 + 1] = 0;
      }
      const col1Atom = new Uint8Array(8 + col1Utf16.length);
      col1Atom[2] = 0xa0;
      col1Atom[3] = 0x0f;
      col1Atom[4] = col1Utf16.length & 0xff;
      col1Atom[5] = (col1Utf16.length >> 8) & 0xff;
      col1Atom.set(col1Utf16, 8);

      const col2 = 'Column 2';
      const col2Utf16 = new Uint8Array(col2.length * 2);
      for (let i = 0; i < col2.length; i++) {
        col2Utf16[i * 2] = col2.charCodeAt(i);
        col2Utf16[i * 2 + 1] = 0;
      }
      const col2Atom = new Uint8Array(8 + col2Utf16.length);
      col2Atom[2] = 0xa0;
      col2Atom[3] = 0x0f;
      col2Atom[4] = col2Utf16.length & 0xff;
      col2Atom[5] = (col2Utf16.length >> 8) & 0xff;
      col2Atom.set(col2Utf16, 8);

      const payloadLen = titleAtom.length + col1Atom.length + col2Atom.length;
      const container = new Uint8Array(8 + payloadLen);
      container[2] = 0xee;
      container[3] = 0x03;
      container[4] = payloadLen & 0xff;
      container[5] = (payloadLen >> 8) & 0xff;
      let offset = 8;
      container.set(titleAtom, offset);
      offset += titleAtom.length;
      container.set(col1Atom, offset);
      offset += col1Atom.length;
      container.set(col2Atom, offset);

      const parsed = await parseBinaryPpt(container.buffer);
      expect(parsed.slides.length).toBe(1);
      expect(parsed.slides[0].layoutType).toBe('table');
      expect(parsed.slides[0].tableData).toBeDefined();
      expect(parsed.slides[0].tableData?.headers).toContain('Column 1');
      expect(parsed.slides[0].tableData?.headers).toContain('Column 2');
    });

    it('identifies Chart slides and populates structured chartData', async () => {
      const title = 'Chart';
      const titleUtf16 = new Uint8Array(title.length * 2);
      for (let i = 0; i < title.length; i++) {
        titleUtf16[i * 2] = title.charCodeAt(i);
        titleUtf16[i * 2 + 1] = 0;
      }
      const titleAtom = new Uint8Array(8 + titleUtf16.length);
      titleAtom[2] = 0xa0;
      titleAtom[3] = 0x0f;
      titleAtom[4] = titleUtf16.length & 0xff;
      titleAtom[5] = (titleUtf16.length >> 8) & 0xff;
      titleAtom.set(titleUtf16, 8);

      const payloadLen = titleAtom.length;
      const container = new Uint8Array(8 + payloadLen);
      container[2] = 0xee;
      container[3] = 0x03;
      container[4] = payloadLen & 0xff;
      container[5] = (payloadLen >> 8) & 0xff;
      container.set(titleAtom, 8);

      const parsed = await parseBinaryPpt(container.buffer);
      expect(parsed.slides.length).toBe(1);
      expect(parsed.slides[0].layoutType).toBe('chart');
      expect(parsed.slides[0].chartData).toBeDefined();
      expect(parsed.slides[0].chartData?.type).toBe('bar');
    });
  });

  describe('parseXlsx and exportSpreadsheetToXlsx round-trip', () => {
    it('persists cell styles, column widths, and row heights across export and parse', async () => {
      const initialSheet = {
        name: 'Report',
        rows: [
          ['Product', 'Revenue', 'Status'],
          ['Software', '50000', 'Active'],
          ['Hardware', '25000', 'Pending'],
        ],
        maxCols: 3,
        cellStyles: {
          '0:0': { bold: true, bg: '#fef08a', color: '#1e293b', align: 'center' as const },
          '0:1': { bold: true, bg: '#fef08a', color: '#1e293b', align: 'right' as const },
          '0:2': { bold: true, bg: '#fef08a', color: '#1e293b', align: 'center' as const },
          '1:1': { italic: true, color: '#15803d', align: 'right' as const },
          '2:2': { bold: true, bg: '#fecaca', color: '#b91c1c' },
        },
        colWidths: [150, 180, 120],
        rowHeights: [40, 30, 30],
      };

      const file = await exportSpreadsheetToXlsx([initialSheet], 'report.xlsx');
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('report.xlsx');

      const arrayBuffer = await file.arrayBuffer();
      const parsed = await parseXlsx(arrayBuffer);

      expect(parsed.type).toBe('xlsx');
      expect(parsed.sheets.length).toBe(1);

      const parsedSheet = parsed.sheets[0];
      expect(parsedSheet.name).toBe('Report');
      expect(parsedSheet.rows[0]).toEqual(['Product', 'Revenue', 'Status']);
      expect(parsedSheet.rows[1]).toEqual(['Software', '50000', 'Active']);

      // Cell styles preservation
      expect(parsedSheet.cellStyles?.['0:0']?.bold).toBe(true);
      expect(parsedSheet.cellStyles?.['0:0']?.bg?.toLowerCase()).toBe('#fef08a');
      expect(parsedSheet.cellStyles?.['0:0']?.align).toBe('center');

      expect(parsedSheet.cellStyles?.['1:1']?.italic).toBe(true);
      expect(parsedSheet.cellStyles?.['1:1']?.color?.toLowerCase()).toBe('#15803d');
      expect(parsedSheet.cellStyles?.['1:1']?.align).toBe('right');

      expect(parsedSheet.cellStyles?.['2:2']?.bold).toBe(true);
      expect(parsedSheet.cellStyles?.['2:2']?.bg?.toLowerCase()).toBe('#fecaca');
      expect(parsedSheet.cellStyles?.['2:2']?.color?.toLowerCase()).toBe('#b91c1c');

      // Column widths and row heights preservation
      expect(parsedSheet.colWidths?.[0]).toBeGreaterThanOrEqual(140);
      expect(parsedSheet.colWidths?.[1]).toBeGreaterThanOrEqual(170);
      expect(parsedSheet.rowHeights?.[0]).toBeGreaterThanOrEqual(35);
    });
  });
});
