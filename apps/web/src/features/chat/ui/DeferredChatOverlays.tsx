import { lazy, type ComponentProps } from 'react';
import { DeferredFeatureBoundary } from './DeferredFeatureBoundary';

const BatchDelete = lazy(() => import('./BatchDeleteModal'));
const Forward = lazy(() => import('./ForwardMessageModal'));
const Pinned = lazy(() => import('./PinnedMessagesModal'));
const Media = lazy(() => import('./MediaLightbox'));
const Details = lazy(() => import('./ConversationDetailsPanel'));
const Search = lazy(() => import('./MessageSearchPanel'));
const DatePicker = lazy(() => import('./ChatDatePicker'));

export function DeferredBatchDeleteModal(props: ComponentProps<typeof BatchDelete>) {
  return (
    <DeferredFeatureBoundary label="message deletion" onClose={props.onClose}>
      <BatchDelete {...props} />
    </DeferredFeatureBoundary>
  );
}
export function DeferredForwardMessageModal(props: ComponentProps<typeof Forward>) {
  return (
    <DeferredFeatureBoundary label="message forwarding" onClose={props.onClose}>
      <Forward {...props} />
    </DeferredFeatureBoundary>
  );
}
export function DeferredPinnedMessagesModal(props: ComponentProps<typeof Pinned>) {
  return (
    <DeferredFeatureBoundary label="pinned messages" onClose={props.onClose}>
      <Pinned {...props} />
    </DeferredFeatureBoundary>
  );
}
export function DeferredMediaLightbox(props: ComponentProps<typeof Media>) {
  return (
    <DeferredFeatureBoundary label="media preview" onClose={props.onClose}>
      <Media {...props} />
    </DeferredFeatureBoundary>
  );
}
export function DeferredConversationDetailsPanel(props: ComponentProps<typeof Details>) {
  return (
    <DeferredFeatureBoundary
      label="conversation details"
      presentation="panel"
      onClose={props.onClose}
    >
      <Details {...props} />
    </DeferredFeatureBoundary>
  );
}
export function DeferredMessageSearchPanel(props: ComponentProps<typeof Search>) {
  return (
    <DeferredFeatureBoundary label="chat search" presentation="panel" onClose={props.onClose}>
      <Search {...props} />
    </DeferredFeatureBoundary>
  );
}
export function DeferredChatDatePicker(props: ComponentProps<typeof DatePicker>) {
  return (
    <DeferredFeatureBoundary label="chat calendar" onClose={props.onClose}>
      <DatePicker {...props} />
    </DeferredFeatureBoundary>
  );
}
