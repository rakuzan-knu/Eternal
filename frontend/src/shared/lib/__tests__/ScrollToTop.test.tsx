import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ScrollToTop } from '../ScrollToTop';

describe('ScrollToTop Component', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    document.documentElement.scrollTo = vi.fn();
    document.body.scrollTo = vi.fn();
  });

  it('scrolls window to (0, 0) upon route render without hash', () => {
    render(
      <MemoryRouter initialEntries={['/download']}>
        <ScrollToTop />
      </MemoryRouter>,
    );

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('scrolls element into view when hash is provided', () => {
    const mockScrollIntoView = vi.fn();
    const testEl = document.createElement('div');
    testEl.id = 'all-jobs';
    testEl.scrollIntoView = mockScrollIntoView;
    document.body.appendChild(testEl);

    render(
      <MemoryRouter initialEntries={['/careers#all-jobs']}>
        <ScrollToTop />
      </MemoryRouter>,
    );

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    document.body.removeChild(testEl);
  });
});
