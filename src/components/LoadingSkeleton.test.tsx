import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSkeleton from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders a single skeleton by default', () => {
    render(<LoadingSkeleton />);
    const skeletons = screen.getAllByRole('status');
    expect(skeletons).toHaveLength(1);
    expect(skeletons[0]).toHaveClass('loading-skeleton');
  });

  it('renders multiple skeletons when count > 1', () => {
    render(<LoadingSkeleton count={3} />);
    expect(screen.getAllByRole('status')).toHaveLength(3);
  });

  it('applies text variant styles by default', () => {
    render(<LoadingSkeleton />);
    const el = screen.getByRole('status');
    expect(el.style.borderRadius).toBe('4px');
    expect(el.style.height).toBe('1em');
  });

  it('applies circle variant styles', () => {
    render(<LoadingSkeleton variant="circle" width={40} />);
    const el = screen.getByRole('status');
    expect(el.style.borderRadius).toBe('50%');
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });

  it('applies rect variant styles', () => {
    render(<LoadingSkeleton variant="rect" width="200px" height="100px" />);
    const el = screen.getByRole('status');
    expect(el.style.borderRadius).toBe('8px');
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('100px');
  });

  it('applies custom className', () => {
    render(<LoadingSkeleton className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });

  it('has accessible aria-label', () => {
    render(<LoadingSkeleton />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
