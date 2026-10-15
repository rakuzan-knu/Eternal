import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeferredImageEditorModal, DeferredVideoEditorModal } from '../DeferredChatEditors';

vi.mock('@/shared/ui/ImageEditorModal', async () => new Promise(() => {}));
vi.mock('@/shared/ui/VideoEditorModal', async () => new Promise(() => {}));

describe('deferred editor cancellation contracts', () => {
  it.each([DeferredImageEditorModal, DeferredVideoEditorModal])(
    'allows cancellation before an editor module arrives',
    (Editor) => {
      const onCancel = vi.fn();
      render(
        <Editor file={new File(['media'], 'fixture.mp4')} onCancel={onCancel} onSave={vi.fn()} />,
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalledOnce();
    },
  );
});
