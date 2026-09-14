import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StoryViewerModal } from '../StoryViewerModal';
import { useStoryViewerStore } from '../../model/useStoryViewerStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'u-1',
      username: 'alice',
      displayName: 'Alice',
      avatar: null,
    },
  }),
}));

const mockFeed = [
  {
    user: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
    hasUnviewed: true,
    hasCloseFriendsStory: false,
    latestStoryTimestamp: new Date().toISOString(),
    stories: [
      {
        id: 's-1',
        authorId: 'u-2',
        mediaUrl: 'https://example.com/story.jpg',
        mediaType: 'IMAGE' as const,
        caption: 'Hello from Bob',
        overlays: null,
        privacy: 'ALL_FOLLOWERS' as const,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        viewsCount: 1,
        hasViewed: false,
        userReaction: null,
        reactionsCount: {},
        pollResult: null,
        author: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
      },
    ],
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('StoryViewerModal', () => {
  beforeEach(() => {
    useStoryViewerStore.getState().closeViewer();
  });

  it('does not render when closed', () => {
    const { container } = render(<StoryViewerModal />, { wrapper: createWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('renders story when viewer is open', () => {
    useStoryViewerStore.getState().openViewer(mockFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    expect(screen.getByText('Hello from Bob')).toBeDefined();
    expect(screen.getByPlaceholderText(/Reply to Bob/)).toBeDefined();
  });

  it('closes viewer on clicking close button', () => {
    useStoryViewerStore.getState().openViewer(mockFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    const closeBtn = screen.getByLabelText('Close story viewer');
    fireEvent.click(closeBtn);

    expect(useStoryViewerStore.getState().isOpen).toBe(false);
  });

  it('toggles pause when clicking the pause button', () => {
    useStoryViewerStore.getState().openViewer(mockFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    const pauseBtn = screen.getByTitle('Pause');
    fireEvent.click(pauseBtn);

    expect(useStoryViewerStore.getState().isPaused).toBe(true);

    const playBtn = screen.getByTitle('Resume');
    fireEvent.click(playBtn);

    expect(useStoryViewerStore.getState().isPaused).toBe(false);
  });

  it('toggles mute when clicking the volume button', () => {
    useStoryViewerStore.getState().openViewer(mockFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    const initialMuted = useStoryViewerStore.getState().isMuted;
    const volBtn = screen.getByTitle(initialMuted ? 'Unmute' : 'Mute');
    fireEvent.click(volBtn);

    expect(useStoryViewerStore.getState().isMuted).toBe(!initialMuted);
  });

  it('opens and closes options menu on three dots click', () => {
    useStoryViewerStore.getState().openViewer(mockFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    const moreBtn = screen.getByTitle('Story options');
    fireEvent.click(moreBtn);

    expect(screen.getByText('Copy link')).toBeDefined();
    expect(screen.getByText('Share')).toBeDefined();
  });

  it('navigates between stories forward and backward via chevrons', () => {
    const multiStoryFeed = [
      {
        user: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
        hasUnviewed: true,
        hasCloseFriendsStory: false,
        latestStoryTimestamp: new Date().toISOString(),
        stories: [
          {
            id: 's-1',
            authorId: 'u-2',
            mediaUrl: 'https://example.com/story1.jpg',
            mediaType: 'IMAGE' as const,
            caption: 'First Story',
            overlays: null,
            privacy: 'ALL_FOLLOWERS' as const,
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            viewsCount: 1,
            hasViewed: false,
            userReaction: null,
            reactionsCount: {},
            pollResult: null,
            author: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
          },
          {
            id: 's-2',
            authorId: 'u-2',
            mediaUrl: 'https://example.com/story2.jpg',
            mediaType: 'IMAGE' as const,
            caption: 'Second Story',
            overlays: null,
            privacy: 'ALL_FOLLOWERS' as const,
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            viewsCount: 1,
            hasViewed: false,
            userReaction: null,
            reactionsCount: {},
            pollResult: null,
            author: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
          },
        ],
      },
    ];

    useStoryViewerStore.getState().openViewer(multiStoryFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    expect(screen.getByText('First Story')).toBeDefined();

    const nextBtn = screen.getByLabelText('Next story');
    fireEvent.click(nextBtn);

    expect(useStoryViewerStore.getState().activeStoryIndex).toBe(1);
    expect(screen.getByText('Second Story')).toBeDefined();

    const prevBtn = screen.getByLabelText('Previous story');
    fireEvent.click(prevBtn);

    expect(useStoryViewerStore.getState().activeStoryIndex).toBe(0);
    expect(screen.getByText('First Story')).toBeDefined();
  });

  it('opens DeleteStoryConfirmModal when clicking delete story in options menu for own story', () => {
    const ownStoryFeed = [
      {
        user: { id: 'u-1', username: 'alice', displayName: 'Alice', avatar: null },
        hasUnviewed: false,
        hasCloseFriendsStory: false,
        latestStoryTimestamp: new Date().toISOString(),
        stories: [
          {
            id: 's-own',
            authorId: 'u-1',
            mediaUrl: 'https://example.com/own-story.jpg',
            mediaType: 'IMAGE' as const,
            caption: 'My Own Story',
            overlays: null,
            privacy: 'ALL_FOLLOWERS' as const,
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            viewsCount: 0,
            hasViewed: true,
            userReaction: null,
            reactionsCount: {},
            pollResult: null,
            author: { id: 'u-1', username: 'alice', displayName: 'Alice', avatar: null },
          },
        ],
      },
    ];

    useStoryViewerStore.getState().openViewer(ownStoryFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    const moreBtn = screen.getByTitle('Story options');
    fireEvent.click(moreBtn);

    const deleteOption = screen.getByText('Delete story');
    expect(deleteOption).toBeInTheDocument();

    fireEvent.click(deleteOption);

    expect(screen.getByText('Delete Story?')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this story? This action cannot be undone.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Delete Story?')).not.toBeInTheDocument();
  });

  it('renders drawing overlay as full-frame canvas layer without sticker controls', () => {
    const drawingStoryFeed = [
      {
        user: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
        hasUnviewed: true,
        hasCloseFriendsStory: false,
        latestStoryTimestamp: new Date().toISOString(),
        stories: [
          {
            id: 's-drawing',
            authorId: 'u-2',
            mediaUrl: 'https://example.com/story.jpg',
            mediaType: 'IMAGE' as const,
            caption: 'Story with drawing',
            overlays: [
              {
                id: 'draw-1',
                type: 'drawing' as const,
                strokes: [
                  {
                    tool: 'pencil' as const,
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
              },
            ],
            privacy: 'ALL_FOLLOWERS' as const,
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            viewsCount: 1,
            hasViewed: false,
            userReaction: null,
            reactionsCount: {},
            pollResult: null,
            author: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
          },
        ],
      },
    ];

    useStoryViewerStore.getState().openViewer(drawingStoryFeed, 0, 0);
    const { container } = render(<StoryViewerModal />, { wrapper: createWrapper() });

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas?.parentElement?.className).toContain(
      'absolute inset-0 w-full h-full pointer-events-none',
    );
  });
});
