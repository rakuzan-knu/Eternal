import { lazy, type ComponentProps } from 'react';
import { DeferredFeatureBoundary } from './DeferredFeatureBoundary';

const DocumentEditor = lazy(() => import('./DocumentPreviewModal'));
const ImageEditor = lazy(() => import('@/shared/ui/ImageEditorModal'));
const VideoEditor = lazy(() => import('@/shared/ui/VideoEditorModal'));

export function DeferredDocumentPreviewModal(props: ComponentProps<typeof DocumentEditor>) {
  return (
    <DeferredFeatureBoundary label="document preview" onClose={props.onClose}>
      <DocumentEditor {...props} />
    </DeferredFeatureBoundary>
  );
}

export function DeferredImageEditorModal(props: ComponentProps<typeof ImageEditor>) {
  return (
    <DeferredFeatureBoundary label="image editor" onClose={props.onCancel}>
      <ImageEditor {...props} />
    </DeferredFeatureBoundary>
  );
}

export function DeferredVideoEditorModal(props: ComponentProps<typeof VideoEditor>) {
  return (
    <DeferredFeatureBoundary label="video editor" onClose={props.onCancel}>
      <VideoEditor {...props} />
    </DeferredFeatureBoundary>
  );
}
