import { DOCUMENTS, type DocumentId } from '../../legal/model/documents';
import { CONTENT_PATHS, type ContentPageId } from './content';

export type ContentTarget =
  | { kind: 'content'; id: ContentPageId }
  | { kind: 'document'; id: DocumentId }
  | { kind: 'help' }
  | { kind: 'web'; path: string }
  | { kind: 'external'; url: string };

const DOCUMENT_ALIASES: Record<DocumentId, string[]> = {
  terms: [],
  guidelines: [],
  'paid-services': ['/terms/paid', '/terms/refunds', '/terms/refund-policy'],
  copyright: ['/dmca', '/terms/copyright', '/terms/dmca'],
  'developer-terms': ['/terms/developers', '/developers', '/developer'],
  privacy: [],
  cookies: ['/terms/cookies'],
  'privacy-controls': ['/terms/privacy-controls', '/privacy/controls'],
  'data-package': ['/terms/data-package', '/privacy/data-package'],
  'regional-privacy': ['/terms/local-laws', '/privacy/regional'],
  retention: ['/terms/retention', '/privacy/retention'],
  'applicant-privacy': ['/terms/applicant-candidate-privacy-policy'],
  'law-enforcement': ['/safety-law-enforcement', '/safety/law', '/law-enforcement'],
};

const TARGETS = new Map<string, ContentTarget>([
  ['/safety', { kind: 'help' }],
  ...DOCUMENTS.flatMap((doc) =>
    [doc.webPath, ...DOCUMENT_ALIASES[doc.id]].map(
      (path) => [path, { kind: 'document', id: doc.id }] as [string, ContentTarget],
    ),
  ),
  ...(Object.entries(CONTENT_PATHS) as [ContentPageId, string[]][]).flatMap(([id, paths]) =>
    paths.map((path) => [path, { kind: 'content', id }] as [string, ContentTarget]),
  ),
]);

export function resolveContentPath(link: string): ContentTarget {
  const value = link.trim();
  if (/^https?:\/\//i.test(value)) return { kind: 'external', url: value };
  if (!value.startsWith('/') || value.startsWith('//')) return { kind: 'web', path: '/' };
  const path = value.split(/[?#]/)[0]?.replace(/\/+$/, '').toLowerCase() || '/';
  return TARGETS.get(path) ?? { kind: 'web', path: value };
}
