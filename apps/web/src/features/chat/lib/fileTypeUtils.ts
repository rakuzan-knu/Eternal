export type FileCategory =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'text'
  | 'archive'
  | 'audio'
  | 'video'
  | 'image'
  | 'code'
  | 'other';

export interface FileTypeMeta {
  category: FileCategory;
  extension: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  lightBg: string;
  borderColor: string;
  description: string;
  isPreviewable: boolean;
}

export function getFileExtension(fileName?: string | null): string {
  if (!fileName) return '';
  const clean = fileName.split('?')[0].split('#')[0];
  const lastDot = clean.lastIndexOf('.');
  if (lastDot === -1 || lastDot === clean.length - 1) return '';
  return clean.slice(lastDot + 1).toLowerCase();
}

export function getFileTypeMeta(fileName?: string | null, mimeType?: string | null): FileTypeMeta {
  const ext = getFileExtension(fileName);
  const mime = (mimeType || '').toLowerCase();

  // 1. PDF
  if (ext === 'pdf' || mime === 'application/pdf') {
    return {
      category: 'pdf',
      extension: 'pdf',
      badgeLabel: 'PDF',
      badgeBg: 'bg-[#ef4444]',
      badgeText: 'text-white',
      accentColor: '#ef4444',
      lightBg: 'bg-red-500/15',
      borderColor: 'border-red-500/30',
      description: 'PDF Document',
      isPreviewable: true,
    };
  }

  // 2. Word documents
  if (
    ['docx', 'doc', 'odt', 'rtf', 'dotx', 'dot'].includes(ext) ||
    mime.includes('word') ||
    mime.includes('opendocument.text')
  ) {
    return {
      category: 'word',
      extension: ext || 'docx',
      badgeLabel: ext === 'doc' ? 'DOC' : ext === 'odt' ? 'ODT' : ext === 'rtf' ? 'RTF' : 'DOCX',
      badgeBg: 'bg-[#2563eb]',
      badgeText: 'text-white',
      accentColor: '#2563eb',
      lightBg: 'bg-blue-500/15',
      borderColor: 'border-blue-500/30',
      description: 'Word Document',
      isPreviewable: ['docx', 'odt', 'rtf'].includes(ext) || ext === '',
    };
  }

  // 3. Excel / Spreadsheets
  if (
    ['xlsx', 'xls', 'ods', 'csv', 'tsv', 'xltx'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'text/csv'
  ) {
    return {
      category: 'excel',
      extension: ext || 'xlsx',
      badgeLabel: ext === 'csv' ? 'CSV' : ext === 'ods' ? 'ODS' : ext === 'xls' ? 'XLS' : 'XLSX',
      badgeBg: 'bg-[#16a34a]',
      badgeText: 'text-white',
      accentColor: '#16a34a',
      lightBg: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/30',
      description: 'Spreadsheet',
      isPreviewable: ['xlsx', 'ods', 'csv', 'tsv'].includes(ext) || ext === '',
    };
  }

  // 4. PowerPoint / Presentations
  if (
    ['pptx', 'ppt', 'odp', 'potx'].includes(ext) ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  ) {
    return {
      category: 'powerpoint',
      extension: ext || 'pptx',
      badgeLabel: ext === 'ppt' ? 'PPT' : ext === 'odp' ? 'ODP' : 'PPTX',
      badgeBg: 'bg-[#ea580c]',
      badgeText: 'text-white',
      accentColor: '#ea580c',
      lightBg: 'bg-orange-500/15',
      borderColor: 'border-orange-500/30',
      description: 'Presentation',
      isPreviewable: ['pptx', 'odp'].includes(ext) || ext === '',
    };
  }

  // 5. Plain text & Markdown
  if (
    ['txt', 'text', 'md', 'markdown', 'log'].includes(ext) ||
    mime.startsWith('text/plain') ||
    mime.includes('markdown')
  ) {
    return {
      category: 'text',
      extension: ext || 'txt',
      badgeLabel: ext === 'md' ? 'MD' : ext === 'log' ? 'LOG' : 'TXT',
      badgeBg: 'bg-[#0284c7]',
      badgeText: 'text-white',
      accentColor: '#0284c7',
      lightBg: 'bg-sky-500/15',
      borderColor: 'border-sky-500/30',
      description: 'Text Document',
      isPreviewable: true,
    };
  }

  // 6. Code / Data
  if (
    [
      'json',
      'xml',
      'html',
      'htm',
      'css',
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'c',
      'cpp',
      'rs',
      'go',
      'sql',
      'yaml',
      'yml',
    ].includes(ext) ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('javascript')
  ) {
    return {
      category: 'code',
      extension: ext || 'code',
      badgeLabel: (ext || 'CODE').toUpperCase().slice(0, 4),
      badgeBg: 'bg-[#7c3aed]',
      badgeText: 'text-white',
      accentColor: '#7c3aed',
      lightBg: 'bg-purple-500/15',
      borderColor: 'border-purple-500/30',
      description: 'Source Code',
      isPreviewable: true,
    };
  }

  // 7. Archives
  if (
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext) ||
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed')
  ) {
    return {
      category: 'archive',
      extension: ext || 'zip',
      badgeLabel: (ext || 'ZIP').toUpperCase().slice(0, 4),
      badgeBg: 'bg-[#d97706]',
      badgeText: 'text-white',
      accentColor: '#d97706',
      lightBg: 'bg-amber-500/15',
      borderColor: 'border-amber-500/30',
      description: 'Archive File',
      isPreviewable: false,
    };
  }

  // 8. Audio
  if (
    ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'].includes(ext) ||
    mime.startsWith('audio/')
  ) {
    return {
      category: 'audio',
      extension: ext || 'audio',
      badgeLabel: (ext || 'AUDIO').toUpperCase().slice(0, 4),
      badgeBg: 'bg-[#9333ea]',
      badgeText: 'text-white',
      accentColor: '#9333ea',
      lightBg: 'bg-purple-500/15',
      borderColor: 'border-purple-500/30',
      description: 'Audio File',
      isPreviewable: false,
    };
  }

  // 9. Video
  if (
    ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv'].includes(ext) ||
    mime.startsWith('video/')
  ) {
    return {
      category: 'video',
      extension: ext || 'video',
      badgeLabel: (ext || 'VIDEO').toUpperCase().slice(0, 4),
      badgeBg: 'bg-[#4f46e5]',
      badgeText: 'text-white',
      accentColor: '#4f46e5',
      lightBg: 'bg-indigo-500/15',
      borderColor: 'border-indigo-500/30',
      description: 'Video File',
      isPreviewable: false,
    };
  }

  // 10. Image
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return {
      category: 'image',
      extension: ext || 'img',
      badgeLabel: (ext || 'IMG').toUpperCase().slice(0, 4),
      badgeBg: 'bg-[#059669]',
      badgeText: 'text-white',
      accentColor: '#059669',
      lightBg: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/30',
      description: 'Image File',
      isPreviewable: false,
    };
  }

  // Fallback
  return {
    category: 'other',
    extension: ext || 'file',
    badgeLabel: (ext || 'FILE').toUpperCase().slice(0, 4),
    badgeBg: 'bg-[#475569]',
    badgeText: 'text-white',
    accentColor: '#64748b',
    lightBg: 'bg-slate-500/15',
    borderColor: 'border-slate-500/30',
    description: 'Document File',
    isPreviewable: false,
  };
}

export function isDocumentPreviewable(fileName?: string | null, mimeType?: string | null): boolean {
  const meta = getFileTypeMeta(fileName, mimeType);
  return meta.isPreviewable;
}
