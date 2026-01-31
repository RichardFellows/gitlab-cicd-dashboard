import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FailureFrequencyIndicator from './FailureFrequencyIndicator';

describe('FailureFrequencyIndicator', () => {
  it('renders full text by default', () => {
    render(<FailureFrequencyIndicator failedCount={3} totalCount={10} />);
    expect(screen.getByText('Failed 3 of 10 runs')).toBeInTheDocument();
  });

  it('renders compact format', () => {
    render(<FailureFrequencyIndicator failedCount={3} totalCount={10} compact />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('shows dash when no history available', () => {
    render(<FailureFrequencyIndicator failedCount={0} totalCount={0} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('has tooltip with full text', () => {
    const { container } = render(
      <FailureFrequencyIndicator failedCount={5} totalCount={20} />
    );
    const indicator = container.querySelector('.failure-frequency-indicator');
    expect(indicator?.getAttribute('title')).toBe('This job has failed 5 of the last 20 runs');
  });

  it('has data attributes for testing', () => {
    const { container } = render(
      <FailureFrequencyIndicator failedCount={2} totalCount={8} />
    );
    const el = container.querySelector('.failure-frequency-indicator');
    expect(el?.getAttribute('data-failed')).toBe('2');
    expect(el?.getAttribute('data-total')).toBe('8');
  });

  it('uses green colour for low failure rate', () => {
    const { container } = render(
      <FailureFrequencyIndicator failedCount={1} totalCount={10} />
    );
    const el = container.querySelector('.failure-frequency-indicator') as HTMLElement;
    expect(el.style.color).toBe('rgb(40, 167, 69)'); // #28a745
  });

  it('uses red colour for high failure rate', () => {
    const { container } = render(
      <FailureFrequencyIndicator failedCount={8} totalCount={10} />
    );
    const el = container.querySelector('.failure-frequency-indicator') as HTMLElement;
    expect(el.style.color).toBe('rgb(220, 53, 69)'); // #dc3545
  });

  it('uses yellow colour for moderate failure rate', () => {
    const { container } = render(
      <FailureFrequencyIndicator failedCount={3} totalCount={10} />
    );
    const el = container.querySelector('.failure-frequency-indicator') as HTMLElement;
    expect(el.style.color).toBe('rgb(255, 193, 7)'); // #ffc107
  });
});
