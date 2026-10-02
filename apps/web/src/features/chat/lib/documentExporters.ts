import JSZip from 'jszip';
import { SpreadsheetSheet, PresentationSlide } from './documentParsers';
import { PPTX_TEMPLATE_BASE64 } from './pptxTemplateBase64';

/**
 * Packs a 2D spreadsheet dataset into a valid Microsoft Excel (.xlsx) file.
 * Creates standard OpenXML structure recognized by Excel, Google Sheets, LibreOffice.
 */
export async function exportSpreadsheetToXlsx(
  sheets: SpreadsheetSheet[],
  fileName: string = 'workbook.xlsx',
): Promise<File> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  let sheetOverrides = '';
  for (let i = 0; i < sheets.length; i++) {
    sheetOverrides += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  }

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  ${sheetOverrides}
</Types>`;
  zip.file('[Content_Types].xml', contentTypesXml);

  // 2. _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  zip.file('_rels/.rels', rootRelsXml);

  // 3. xl/_rels/workbook.xml.rels
  let wbRelsEntries = '';
  for (let i = 0; i < sheets.length; i++) {
    wbRelsEntries += `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`;
  }
  const stylesRelId = `rId${sheets.length + 1}`;
  const sstRelId = `rId${sheets.length + 2}`;
  wbRelsEntries += `<Relationship Id="${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  wbRelsEntries += `<Relationship Id="${sstRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`;

  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRelsEntries}
</Relationships>`;
  zip.file('xl/_rels/workbook.xml.rels', wbRelsXml);

  // 4. xl/workbook.xml
  let sheetsXmlEntries = '';
  for (let i = 0; i < sheets.length; i++) {
    const sName = escapeXml(sheets[i].name || `Sheet ${i + 1}`);
    sheetsXmlEntries += `<sheet name="${sName}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`;
  }
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetsXmlEntries}
  </sheets>
</workbook>`;
  zip.file('xl/workbook.xml', workbookXml);

  // 5. Build Font, Fill, and Xf registries across all sheets
  interface ExportFont {
    bold: boolean;
    italic: boolean;
    color?: string;
  }
  interface ExportFill {
    bg: string;
  }
  interface ExportXf {
    fontId: number;
    fillId: number;
    align?: 'left' | 'center' | 'right';
  }

  const fonts: ExportFont[] = [{ bold: false, italic: false }]; // font 0: default
  const fontMap = new Map<string, number>();
  fontMap.set('0_0_', 0);

  const getFontId = (bold?: boolean, italic?: boolean, color?: string): number => {
    const b = !!bold;
    const it = !!italic;
    const c = color ? color.trim().toLowerCase() : '';
    const key = `${b ? 1 : 0}_${it ? 1 : 0}_${c}`;
    if (fontMap.has(key)) return fontMap.get(key)!;
    const id = fonts.length;
    fonts.push({ bold: b, italic: it, color: c || undefined });
    fontMap.set(key, id);
    return id;
  };

  // fills 0: none, 1: gray125
  const fills: ExportFill[] = [];
  const fillMap = new Map<string, number>();
  fillMap.set('', 0);

  const getFillId = (bg?: string): number => {
    if (!bg) return 0;
    const cleanBg = bg.trim().toLowerCase();
    if (fillMap.has(cleanBg)) return fillMap.get(cleanBg)!;
    const id = fills.length + 2; // custom fills start at index 2
    fills.push({ bg: cleanBg });
    fillMap.set(cleanBg, id);
    return id;
  };

  // cellXfs 0: default
  const cellXfs: ExportXf[] = [{ fontId: 0, fillId: 0 }];
  const xfMap = new Map<string, number>();
  xfMap.set('0_0_', 0);

  const getXfId = (style?: any): number => {
    if (!style) return 0;
    const fontId = getFontId(style.bold, style.italic, style.color);
    const fillId = getFillId(style.bg);
    const align = style.align;
    const key = `${fontId}_${fillId}_${align || ''}`;
    if (xfMap.has(key)) return xfMap.get(key)!;
    const id = cellXfs.length;
    cellXfs.push({ fontId, fillId, align });
    xfMap.set(key, id);
    return id;
  };

  // Pre-scan all cells across sheets to register styles
  for (const s of sheets) {
    if (s.cellStyles) {
      for (const key of Object.keys(s.cellStyles)) {
        getXfId(s.cellStyles[key]);
      }
    }
  }

  let fontsXml = '';
  for (const f of fonts) {
    fontsXml += `<font>${f.bold ? '<b/>' : ''}${f.italic ? '<i/>' : ''}<sz val="11"/><name val="Calibri"/>${f.color ? `<color rgb="${toArgb(f.color)}"/>` : '<color rgb="FF000000"/>'}</font>`;
  }

  let fillsXml = `<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>`;
  for (const fl of fills) {
    fillsXml += `<fill><patternFill patternType="solid"><fgColor rgb="${toArgb(fl.bg)}"/><bgColor indexed="64"/></patternFill></fill>`;
  }

  let xfsXml = '';
  for (const xf of cellXfs) {
    const hasFont = xf.fontId > 0;
    const hasFill = xf.fillId > 1;
    const hasAlign = !!xf.align;
    const applyAttrs = `${hasFont ? ' applyFont="1"' : ''}${hasFill ? ' applyFill="1"' : ''}${hasAlign ? ' applyAlignment="1"' : ''}`;
    xfsXml += `<xf numFmtId="0" fontId="${xf.fontId}" fillId="${xf.fillId}" borderId="0" xfId="0"${applyAttrs}>${xf.align ? `<alignment horizontal="${xf.align}"/>` : ''}</xf>`;
  }

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="${fonts.length}">${fontsXml}</fonts>
  <fills count="${fills.length + 2}">${fillsXml}</fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${cellXfs.length}">${xfsXml}</cellXfs>
</styleSheet>`;
  zip.file('xl/styles.xml', stylesXml);

  // 6. Build sharedStrings and worksheets
  const stringMap = new Map<string, number>();
  const stringsList: string[] = [];

  const getStringIndex = (str: string) => {
    if (stringMap.has(str)) return stringMap.get(str)!;
    const idx = stringsList.length;
    stringMap.set(str, idx);
    stringsList.push(str);
    return idx;
  };

  // Process each sheet
  for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
    const sheet = sheets[sIdx];
    const colCount = Math.max(
      sheet.maxCols || 1,
      sheet.colWidths?.length || 0,
      sheet.rows[0]?.length || 0,
    );
    const colWidths = sheet.colWidths || [];

    // Column Widths (<cols><col min="1" max="1" width="18" customWidth="1"/></cols>)
    let colsXml = '';
    let colEntries = '';
    for (let c = 0; c < colCount; c++) {
      let px = colWidths[c];
      if (!px) {
        let maxLen = 0;
        for (const r of sheet.rows) {
          if (r[c]) maxLen = Math.max(maxLen, r[c].length);
        }
        px = Math.max(100, Math.min(260, maxLen * 9 + 28));
      }
      const charWidth = Math.max(6, Math.round(((px - 12) / 8) * 10) / 10);
      colEntries += `<col min="${c + 1}" max="${c + 1}" width="${charWidth}" customWidth="1"/>`;
    }
    if (colEntries) {
      colsXml = `<cols>${colEntries}</cols>`;
    }

    let sheetDataXml = '';
    const rowCount = sheet.rows.length;

    for (let rIdx = 0; rIdx < rowCount; rIdx++) {
      const row = sheet.rows[rIdx];
      let rowCellsXml = '';
      const cellLimit = Math.max(row.length, colCount);

      for (let cIdx = 0; cIdx < cellLimit; cIdx++) {
        const val = row[cIdx];
        const cellRef = `${colIndexToLetter(cIdx)}${rIdx + 1}`;
        const cellKey = `${rIdx}:${cIdx}`;
        const style = sheet.cellStyles?.[cellKey];
        const xfId = style ? getXfId(style) : 0;
        const sAttr = xfId > 0 ? ` s="${xfId}"` : '';

        if (val !== undefined && val !== null && val !== '') {
          // If numeric, store directly as number
          if (/^-?\d+(\.\d+)?$/.test(val.trim())) {
            rowCellsXml += `<c r="${cellRef}"${sAttr}><v>${val.trim()}</v></c>`;
          } else {
            const strIdx = getStringIndex(val);
            rowCellsXml += `<c r="${cellRef}"${sAttr} t="s"><v>${strIdx}</v></c>`;
          }
        } else if (xfId > 0) {
          rowCellsXml += `<c r="${cellRef}"${sAttr}/>`;
        }
      }

      if (rowCellsXml) {
        const rowHeightPx = sheet.rowHeights?.[rIdx];
        const htPt = rowHeightPx
          ? Math.max(14, Math.round((rowHeightPx / 1.333) * 10) / 10)
          : undefined;
        const htAttr = htPt ? ` ht="${htPt}" customHeight="1"` : '';
        sheetDataXml += `<row r="${rIdx + 1}"${htAttr}>${rowCellsXml}</row>`;
      }
    }

    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  <sheetData>
    ${sheetDataXml}
  </sheetData>
</worksheet>`;
    zip.file(`xl/worksheets/sheet${sIdx + 1}.xml`, worksheetXml);
  }

  // 7. xl/sharedStrings.xml
  let sstEntries = '';
  for (const s of stringsList) {
    sstEntries += `<si><t>${escapeXml(s)}</t></si>`;
  }
  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${stringsList.length}" uniqueCount="${stringsList.length}">
  ${sstEntries}
</sst>`;
  zip.file('xl/sharedStrings.xml', sharedStringsXml);

  const uint8 = await zip.generateAsync({
    type: 'uint8array',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const finalName = fileName.endsWith('.xlsx')
    ? fileName
    : `${fileName.replace(/\.[^.]+$/, '')}.xlsx`;
  const finalFile = new File([uint8 as unknown as BlobPart], finalName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  if (typeof (finalFile as any).arrayBuffer !== 'function') {
    (finalFile as any).arrayBuffer = async () =>
      uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
  }
  return finalFile;
}

/**
 * Packs slides into a valid Microsoft PowerPoint (.pptx) file.
 */
export async function exportPresentationToPptx(
  slides: Array<{
    title: string;
    paragraphs: string[];
    subtitle?: string;
    tableData?: { headers: string[]; rows: string[][] };
    aspectRatio?: '16:9' | '4:3';
    themeColor?: string;
  }>,
  fileName: string = 'presentation.pptx',
): Promise<File> {
  const zip = new JSZip();
  await zip.loadAsync(PPTX_TEMPLATE_BASE64, { base64: true });

  const isFourThree = slides.some((s) => s.aspectRatio === '4:3');
  // 16:9 is 12192000 x 6858000 EMU, 4:3 is 9144000 x 6858000 EMU
  const widthEmu = isFourThree ? 9144000 : 12192000;
  const heightEmu = 6858000;

  const cleanText = (str: string) =>
    escapeXml(
      (str || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim(),
    );

  // 1. Update [Content_Types].xml
  let ct = await zip.file('[Content_Types].xml')!.async('text');
  ct = ct.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
  let slideOverrides = '';
  for (let i = 0; i < slides.length; i++) {
    slideOverrides += `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  }
  ct = ct.replace('</Types>', `${slideOverrides}</Types>`);
  zip.file('[Content_Types].xml', ct);

  // 2. Update ppt/_rels/presentation.xml.rels
  let prRels = await zip.file('ppt/_rels/presentation.xml.rels')!.async('text');
  prRels = prRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"\/>/g, '');
  let slideRels = '';
  for (let i = 0; i < slides.length; i++) {
    slideRels += `<Relationship Id="rId${10 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`;
  }
  prRels = prRels.replace('</Relationships>', `${slideRels}</Relationships>`);
  zip.file('ppt/_rels/presentation.xml.rels', prRels);

  // 3. Update ppt/presentation.xml
  let pres = await zip.file('ppt/presentation.xml')!.async('text');
  let sldIdLst = '';
  for (let i = 0; i < slides.length; i++) {
    sldIdLst += `<p:sldId id="${256 + i}" r:id="rId${10 + i}"/>`;
  }
  pres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIdLst}</p:sldIdLst>`);
  pres = pres.replace(/<p:sldSz[^>]*\/>/, `<p:sldSz cx="${widthEmu}" cy="${heightEmu}"/>`);
  zip.file('ppt/presentation.xml', pres);

  // 4. Write each slide
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const titleText = cleanText(s.title || `Slide ${i + 1}`);
    const bannerColor = s.themeColor ? s.themeColor.replace('#', '') : 'B6E060';

    // Slide relationship pointing to canonical blank slideLayout7.xml
    zip.file(
      `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/>
</Relationships>`,
    );

    let paraXml = '';
    if (s.tableData) {
      const headerLine = s.tableData.headers.map(cleanText).join(' | ');
      paraXml += `<a:p><a:pPr lvl="0"/><a:r><a:rPr lang="uk-UA" sz="2000" b="1"/><a:t>${headerLine}</a:t></a:r></a:p>`;
      for (const row of s.tableData.rows) {
        paraXml += `<a:p><a:pPr lvl="0"/><a:r><a:rPr lang="uk-UA" sz="1800"/><a:t>${row.map(cleanText).join(' | ')}</a:t></a:r></a:p>`;
      }
    } else {
      const allParas = [...(s.subtitle ? [s.subtitle] : []), ...s.paragraphs];
      paraXml = allParas
        .map(cleanText)
        .filter(Boolean)
        .map(
          (p) =>
            `<a:p><a:pPr lvl="0"/><a:r><a:rPr lang="uk-UA" sz="1800"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr><a:t>${p}</a:t></a:r></a:p>`,
        )
        .join('');
    }

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      
      <!-- Top Decorative Theme Banner -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="${100 + i * 10}" name="Banner"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="1100000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="${bannerColor}"/></a:solidFill>
        </p:spPr>
      </p:sp>

      <!-- Slide Title placed over/near banner -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="220000"/><a:ext cx="${widthEmu - 1371600}" cy="760000"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="uk-UA" sz="3200" b="1"><a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></a:rPr><a:t>${titleText}</a:t></a:r></a:p></p:txBody>
      </p:sp>

      <!-- Slide Content Area -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="1450000"/><a:ext cx="${widthEmu - 1371600}" cy="${heightEmu - 1800000}"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/>${paraXml || '<a:p/>'}</p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
    zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  const finalName = fileName.endsWith('.pptx')
    ? fileName
    : `${fileName.replace(/\.[^.]+$/, '')}.pptx`;
  return new File([blob], finalName, {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

/**
 * Packs pages of HTML / text into a valid Microsoft Word (.docx) file.
 */
export async function exportDocxToFile(
  pages: Array<{ html: string; text?: string }>,
  fileName: string = 'document.docx',
): Promise<File> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`,
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  // 3. word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
</w:styles>`,
  );

  // 4. word/document.xml
  let documentBodyXml = '';
  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx];

    // Convert page content into clean Word XML paragraphs
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${page.html}</div>`, 'text/html');
    const nodes = Array.from(doc.body.firstChild?.childNodes || []);

    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent?.trim();
        if (txt) {
          documentBodyXml += `<w:p><w:r><w:t>${escapeXml(txt)}</w:t></w:r></w:p>`;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const text = el.textContent || '';

        let jc = '';
        if (el.className.includes('text-center') || el.style.textAlign === 'center')
          jc = '<w:jc w:val="center"/>';
        else if (el.className.includes('text-right') || el.style.textAlign === 'right')
          jc = '<w:jc w:val="right"/>';
        else if (el.className.includes('text-justify') || el.style.textAlign === 'justify')
          jc = '<w:jc w:val="both"/>';

        const pPr = jc ? `<w:pPr>${jc}</w:pPr>` : '';
        let rPr = '';

        if (tag.startsWith('h')) {
          const sz = tag === 'h1' ? '40' : tag === 'h2' ? '32' : '28';
          rPr = `<w:rPr><w:b/><w:sz w:val="${sz}"/></w:rPr>`;
        } else if (el.querySelector('strong, b') || tag === 'strong' || tag === 'b') {
          rPr = '<w:rPr><w:b/></w:rPr>';
        }

        documentBodyXml += `<w:p>${pPr}<w:r>${rPr}<w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
      }
    }

    // If not last page, insert Word page break
    if (pIdx < pages.length - 1) {
      documentBodyXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }
  }

  // Section properties (standard A4 margins)
  documentBodyXml += `
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  `;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${documentBodyXml}
  </w:body>
</w:document>`;
  zip.file('word/document.xml', documentXml);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const finalName = fileName.endsWith('.docx')
    ? fileName
    : `${fileName.replace(/\.[^.]+$/, '')}.docx`;
  return new File([blob], finalName, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function colIndexToLetter(idx: number): string {
  let letter = '';
  let temp = idx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toArgb(colorStr?: string): string {
  if (!colorStr) return 'FF000000';
  const clean = colorStr.trim().replace(/^#/, '');
  if (clean.length === 6) {
    return `FF${clean.toUpperCase()}`;
  }
  if (clean.length === 8) {
    return clean.toUpperCase();
  }
  if (clean.length === 3) {
    const r = clean[0];
    const g = clean[1];
    const b = clean[2];
    return `FF${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return 'FF000000';
}
