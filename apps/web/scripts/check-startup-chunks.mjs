import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(dist, '.vite/manifest.json'), 'utf8'));
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
const search = Object.keys(manifest).find((key) => key.endsWith('/SearchPage.tsx'));
const messenger = Object.keys(manifest).find(
  (key) =>
    key.endsWith('/Messenger.tsx') ||
    (manifest[key].name === 'Messenger' && manifest[key].isDynamicEntry),
);
if (!entry || !search || !messenger)
  throw new Error('Missing application/search/messenger build entries');
const keys = new Set();
function visit(key) {
  if (keys.has(key)) return;
  keys.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
visit(entry);
visit(search);
const chunks = [...keys].map((key) => {
  const file = manifest[key].file;
  const bytes = fs.readFileSync(path.join(dist, file));
  return { key, file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
});
const forbidden =
  /vendor-(hls|emoji|markdown|prism|html-to-image)|profile-badges|UserBadgeIcon|PremiumTierBadge|ContributorTierBadge|cursorEngine|CallRuntime|StoryEditorModal|StoryViewerModal|Spotify(?:Lyrics|GameMode|MobilePlayer)|RacingProfileFrame/;
const violations = chunks.filter((chunk) => forbidden.test(chunk.key + ' ' + chunk.file));
const chatKeys = new Set();
function visitChat(key) {
  if (chatKeys.has(key)) return;
  chatKeys.add(key);
  for (const dependency of manifest[key].imports ?? []) visitChat(dependency);
}
visitChat(messenger);
const optionalChatFeature =
  /MediaLightbox|DocumentPreviewModal|ImageEditorModal|VideoEditorModal|ChatDatePicker|ConversationDetailsPanel|MessageSearchPanel|BatchDeleteModal|ForwardMessageModal|PinnedMessagesModal/;
const chatViolations = [...chatKeys].filter((key) =>
  optionalChatFeature.test(key + ' ' + manifest[key].file),
);
const deferredFeatures = [
  'MediaLightbox',
  'DocumentPreviewModal',
  'ImageEditorModal',
  'VideoEditorModal',
  'ChatDatePicker',
  'ConversationDetailsPanel',
  'MessageSearchPanel',
  'BatchDeleteModal',
  'ForwardMessageModal',
  'PinnedMessagesModal',
];
// If Rollup merges an eager module into a shared chunk, its source key can
// disappear. Require an actual dynamic entry, in addition to graph exclusion.
for (const name of deferredFeatures) {
  if (!Object.values(manifest).some((chunk) => chunk.name === name && chunk.isDynamicEntry)) {
    chatViolations.push(`${name}: missing independent dynamic entry`);
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'production entry + /search static imports; dynamic imports excluded',
  chunks,
  gzipBytes: chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0),
  maxGzipBytes: 350 * 1024,
  violations,
  chatScope: 'Messenger static imports; closed overlays/editors excluded',
  chatViolations,
};
fs.writeFileSync(path.join(dist, 'startup-budget.json'), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    gzipKiB: +(report.gzipBytes / 1024).toFixed(1),
    chunks: chunks.length,
    violations: violations.map((chunk) => chunk.file),
    chatViolations,
  }),
);
if (violations.length || chatViolations.length || report.gzipBytes > report.maxGzipBytes)
  process.exitCode = 1;
