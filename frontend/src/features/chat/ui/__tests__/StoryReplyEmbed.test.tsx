import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StoryReplyEmbed } from '../StoryReplyEmbed';

describe('StoryReplyEmbed', () => {
  it('renders story image preview when active and valid', () => {
    render(
      <StoryReplyEmbed
        attachment={{
          id: 'att-1',
          url: 'https://example.com/story.jpg',
          type: 'IMAGE',
          name: 'story.jpg',
          size: 1024,
        }}
        createdAt={new Date().toISOString()}
      />,
    );

    expect(screen.getByText('Ответ на историю')).toBeInTheDocument();
    expect(screen.getByAltText('Story Preview')).toBeInTheDocument();
    expect(screen.getByAltText('Story Preview')).toHaveAttribute(
      'src',
      'https://example.com/story.jpg',
    );
  });

  it('renders fallback glassmorphism banner when image encounters an error (404/expired)', () => {
    render(
      <StoryReplyEmbed
        attachment={{
          id: 'att-1',
          url: 'https://example.com/expired-story.jpg',
          type: 'IMAGE',
          name: 'story.jpg',
          size: 1024,
        }}
        createdAt={new Date().toISOString()}
      />,
    );

    const img = screen.getByAltText('Story Preview');
    fireEvent.error(img);

    expect(screen.getByText('История недоступна или срок её действия истек')).toBeInTheDocument();
  });

  it('renders fallback banner when story is older than 24 hours', () => {
    const expiredTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    render(
      <StoryReplyEmbed
        attachment={{
          id: 'att-1',
          url: 'https://example.com/story.jpg',
          type: 'IMAGE',
          name: 'story.jpg',
          size: 1024,
        }}
        createdAt={expiredTimestamp}
      />,
    );

    expect(screen.getByText('История недоступна или срок её действия истек')).toBeInTheDocument();
  });
});
