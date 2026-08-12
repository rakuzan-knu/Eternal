import React, { useMemo, useState } from 'react';
import { X, Image as ImageIcon, FileText, Link as LinkIcon, Play } from 'lucide-react';
import { MessageView } from '../../../entities/chat/model/types';
import Modal from '@/shared/ui/Modal';
import {
  colorForHostname,
  extractFileItems,
  extractLinkItems,
  extractMediaItems,
  groupByMonth,
} from '../lib/extractChatMedia';
import { formatFileSize } from '@/shared/lib/attachmentLimits';
import MediaLightbox from './MediaLightbox';
import EmptyState from '@/shared/ui/EmptyState';

type Tab = 'media' | 'files' | 'links';

interface MediaFilesLinksModalProps {
  messages: MessageView[];
  initialTab: Tab;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function fileIconColor(fileName: string | null): string {
  const ext = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (['zip', 'rar', '7z'].includes(ext)) return '#f97316';
  if (['doc', 'docx'].includes(ext)) return '#3b82f6';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '#22c55e';
  if (['pdf'].includes(ext)) return '#ef4444';
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'json'].includes(ext)) return '#60a5fa';
  return '#6b7280';
}

export default function MediaFilesLinksModal({
  messages,
  initialTab,
  onClose,
  onJumpToMessage,
}: MediaFilesLinksModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mediaItems = useMemo(() => extractMediaItems(messages), [messages]);
  const fileItems = useMemo(() => extractFileItems(messages), [messages]);
  const linkItems = useMemo(() => extractLinkItems(messages), [messages]);

  const mediaGroups = useMemo(() => groupByMonth(mediaItems), [mediaItems]);
  const fileGroups = useMemo(() => groupByMonth(fileItems), [fileItems]);
  const linkGroups = useMemo(() => groupByMonth(linkItems), [linkItems]);

  const handleDownloadFile = (url: string, fileName: string | null) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName ?? 'download';
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <>
      <Modal onClose={onClose} className="w-full max-w-md max-h-[75vh] flex flex-col">
        {(close) => (
          <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Media, files &amp; links</h2>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 px-3 border-b border-white/10 flex-shrink-0">
              {(
                [
                  { key: 'media', label: 'Media', icon: ImageIcon },
                  { key: 'files', label: 'Files', icon: FileText },
                  { key: 'links', label: 'Links', icon: LinkIcon },
                ] as { key: Tab; label: string; icon: typeof ImageIcon }[]
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                    tab === key
                      ? 'text-white border-blue-400'
                      : 'text-gray-500 border-transparent hover:text-gray-300'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
              {tab === 'media' &&
                (mediaGroups.length === 0 ? (
                  <EmptyState
                    icon={<ImageIcon size={26} className="text-white" />}
                    title="No media"
                    subtitle="Photos and videos from this chat will show up here."
                  />
                ) : (
                  mediaGroups.map((group) => (
                    <div key={group.label} className="mb-4 animate-fadeIn">
                      <p className="text-xs font-semibold text-gray-500 mb-2">{group.label}</p>
                      <div className="grid grid-cols-4 gap-1">
                        {group.items.map((item) => {
                          const globalIndex = mediaItems.indexOf(item);
                          return (
                            <button
                              key={item.attachment.id}
                              onClick={() => setLightboxIndex(globalIndex)}
                              className="relative aspect-square rounded-lg overflow-hidden bg-white/5 hover:opacity-80 transition-all active:scale-95"
                            >
                              {item.attachment.type === 'VIDEO' ? (
                                <>
                                  <video
                                    src={item.attachment.url}
                                    className="w-full h-full object-cover"
                                    muted
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <Play size={16} className="text-white" fill="white" />
                                  </span>
                                </>
                              ) : (
                                <img
                                  src={item.attachment.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ))}

              {tab === 'files' &&
                (fileGroups.length === 0 ? (
                  <EmptyState
                    icon={<FileText size={26} className="text-white" />}
                    title="No files"
                    subtitle="Files sent in this chat will show up here."
                  />
                ) : (
                  fileGroups.map((group) => (
                    <div key={group.label} className="mb-4 animate-fadeIn">
                      <p className="text-xs font-semibold text-gray-500 mb-2 px-1">{group.label}</p>
                      <div className="flex flex-col gap-0.5">
                        {group.items.map((item) => (
                          <button
                            key={item.attachment.id}
                            onClick={() =>
                              handleDownloadFile(item.attachment.url, item.attachment.fileName)
                            }
                            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-all active:scale-[0.99] text-left"
                          >
                            <span
                              style={{ backgroundColor: fileIconColor(item.attachment.fileName) }}
                              className="w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center text-white text-[10px] font-bold uppercase"
                            >
                              {(item.attachment.fileName ?? '').split('.').pop()?.slice(0, 4) ||
                                'file'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-white truncate">
                                {item.attachment.fileName ?? 'File'}
                              </span>
                              <span className="block text-xs text-gray-500">
                                {formatFileSize(item.attachment.size)} ·{' '}
                                {new Date(item.message.createdAt).toLocaleDateString()}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ))}

              {tab === 'links' &&
                (linkGroups.length === 0 ? (
                  <EmptyState
                    icon={<LinkIcon size={26} className="text-white" />}
                    title="No links"
                    subtitle="Links shared in this chat will show up here."
                  />
                ) : (
                  linkGroups.map((group) => (
                    <div key={group.label} className="mb-4 animate-fadeIn">
                      <p className="text-xs font-semibold text-gray-500 mb-2 px-1">{group.label}</p>
                      <div className="flex flex-col gap-0.5">
                        {group.items.map((item, i) => (
                          <a
                            key={`${item.message.id}-${i}`}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-all active:scale-[0.99]"
                          >
                            <span
                              style={{ backgroundColor: colorForHostname(item.hostname) }}
                              className="w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center text-white text-base font-bold uppercase"
                            >
                              {item.hostname.charAt(0)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-white truncate">
                                {item.hostname}
                              </span>
                              <span className="block text-xs text-blue-400 truncate">
                                {item.url}
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))
                ))}
            </div>
          </div>
        )}
      </Modal>

      {lightboxIndex !== null && (
        <MediaLightbox
          items={mediaItems}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onJumpToMessage={(messageId) => {
            setLightboxIndex(null);
            onClose();
            onJumpToMessage(messageId);
          }}
        />
      )}
    </>
  );
}
