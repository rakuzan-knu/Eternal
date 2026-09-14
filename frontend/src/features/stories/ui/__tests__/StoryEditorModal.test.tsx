import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StoryEditorModal } from '../StoryEditorModal';
import { useStoryEditorStore } from '../../model/useStoryEditorStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('StoryEditorModal', () => {
  beforeEach(() => {
    useStoryEditorStore.getState().reset();
  });

  it('does not render when modal is closed', () => {
    const { container } = render(<StoryEditorModal />, { wrapper: createWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when opened', () => {
    useStoryEditorStore.getState().openEditor();
    render(<StoryEditorModal />, { wrapper: createWrapper() });

    expect(screen.getByText('Your story')).toBeDefined();
    expect(screen.getByText('Close Friends')).toBeDefined();
  });

  it('opens text overlay tool and allows entering text with font and animation', () => {
    useStoryEditorStore.getState().openEditor();
    render(<StoryEditorModal />, { wrapper: createWrapper() });

    const textToolBtn = screen.getByTitle('Add text');
    fireEvent.click(textToolBtn);

    const textarea = screen.getByPlaceholderText(/Type text/);
    fireEvent.change(textarea, { target: { value: 'Cool Story' } });

    // Select Neon font
    const neonFontBtn = screen.getByText('Neon');
    fireEvent.click(neonFontBtn);

    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    const overlays = useStoryEditorStore.getState().overlays;
    expect(overlays.length).toBe(1);
    expect(overlays[0].type).toBe('text');
    if (overlays[0].type === 'text') {
      expect(overlays[0].text).toBe('Cool Story');
      expect(overlays[0].fontFamily).toBe('neon');
    }
  });

  it('updates caption in store and supports caption input', () => {
    useStoryEditorStore.getState().openEditor();
    render(<StoryEditorModal />, { wrapper: createWrapper() });

    const captionInput = screen.getByPlaceholderText('Add a caption...');
    fireEvent.change(captionInput, { target: { value: 'My epic day' } });

    expect(useStoryEditorStore.getState().caption).toBe('My epic day');
  });

  it('cycles gradient presets when palette button is clicked', () => {
    useStoryEditorStore.getState().openEditor();
    render(<StoryEditorModal />, { wrapper: createWrapper() });

    const initialBg = useStoryEditorStore.getState().backgroundColor;
    const moreBtn = screen.getByTitle('More tools');
    fireEvent.click(moreBtn);
    const paletteBtn = screen.getByTitle('Change gradient');
    fireEvent.click(paletteBtn);

    expect(useStoryEditorStore.getState().backgroundColor).not.toBe(initialBg);
  });

  it('brings overlay to front on selection', () => {
    useStoryEditorStore.getState().openEditor();
    useStoryEditorStore.getState().addOverlay({
      id: 'layer-1',
      type: 'text',
      text: 'First',
      xPercent: 50,
      yPercent: 50,
      zIndex: 1,
    });
    useStoryEditorStore.getState().addOverlay({
      id: 'layer-2',
      type: 'text',
      text: 'Second',
      xPercent: 60,
      yPercent: 60,
      zIndex: 2,
    });

    useStoryEditorStore.getState().bringToFront('layer-1');
    const overlays = useStoryEditorStore.getState().overlays;
    const layer1 = overlays.find((o) => o.id === 'layer-1');
    const layer2 = overlays.find((o) => o.id === 'layer-2');

    expect(layer1?.zIndex).toBeGreaterThan(layer2?.zIndex ?? 0);
  });

  it('animates toolbar labels and unfolds extra tools when expand button is clicked', () => {
    useStoryEditorStore.getState().openEditor();
    render(<StoryEditorModal />, { wrapper: createWrapper() });

    // Initially extra tools are not shown and labels are hidden
    expect(screen.queryByText('Mention')).toBeNull();
    expect(screen.queryByText('Drawing')).toBeNull();

    // Click expand button
    const expandBtn = screen.getByTitle('More tools');
    fireEvent.click(expandBtn);

    // Labels for both main tools and unfolded tools are now visible!
    expect(screen.getByText('Text')).toBeDefined();
    expect(screen.getByText('Stickers')).toBeDefined();
    expect(screen.getByText('Music')).toBeDefined();
    expect(screen.getByText('Filters')).toBeDefined();
    expect(screen.getByText('Media')).toBeDefined();
    expect(screen.getByText('Collapse')).toBeDefined();
    expect(screen.getByText('Mention')).toBeDefined();
    expect(screen.getByText('Drawing')).toBeDefined();
    expect(screen.getByText('Poll')).toBeDefined();
    expect(screen.getByText('Background')).toBeDefined();
  });

  it('renders PC window-like resize handles on selected overlay', () => {
    useStoryEditorStore.getState().openEditor();
    useStoryEditorStore.getState().addOverlay({
      id: 'test-card',
      type: 'text',
      text: 'Resize Me',
      xPercent: 50,
      yPercent: 50,
      scale: 1,
    });
    useStoryEditorStore.getState().setSelectedOverlayId('test-card');

    render(<StoryEditorModal />, { wrapper: createWrapper() });

    // Window-like horizontal, vertical, and diagonal handles should be present
    const hHandles = screen.getAllByTitle('Stretch/compress horizontally');
    const vHandles = screen.getAllByTitle('Stretch/compress vertically');
    const cornerHandles = screen.getAllByTitle('Resize');

    expect(hHandles.length).toBe(2); // Left & Right
    expect(vHandles.length).toBe(2); // Top & Bottom
    expect(cornerHandles.length).toBe(4); // 4 corners
  });

  it('renders drawing overlay as full-frame canvas layer without sticker action handles', () => {
    useStoryEditorStore.getState().openEditor();
    useStoryEditorStore.getState().addOverlay({
      id: 'drawing-1',
      type: 'drawing',
      strokes: [
        {
          tool: 'pencil',
          color: '#ffffff',
          size: 6,
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
        },
      ],
      xPercent: 0,
      yPercent: 0,
      scale: 1,
      rotation: 0,
      zIndex: 12,
    });

    const { container } = render(<StoryEditorModal />, { wrapper: createWrapper() });

    // Drawing canvas should exist in the full-frame container
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas?.parentElement?.className).toContain(
      'absolute inset-0 w-full h-full pointer-events-none',
    );

    // Make sure no sticker resize handles exist for the drawing
    expect(screen.queryByTitle('Stretch/compress horizontally')).toBeNull();
    expect(screen.queryByTitle('Rotate -15°')).toBeNull();
  });
});
