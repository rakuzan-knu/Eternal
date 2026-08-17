import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SkeletonBone from '../SkeletonBone';

describe('SkeletonBone', () => {
  it('renders skeleton shimmer container with custom class', () => {
    const { container } = render(<SkeletonBone className="w-20 h-4 rounded" />);
    const bone = container.firstChild as HTMLElement;
    expect(bone).toHaveClass('skeleton-shimmer');
    expect(bone).toHaveClass('w-20');
    expect(bone).toHaveClass('h-4');
  });
});
