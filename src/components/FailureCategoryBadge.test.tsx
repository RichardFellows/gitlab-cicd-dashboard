import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FailureCategoryBadge from './FailureCategoryBadge';
import { FailureCategory } from '../types';

const makeCategory = (type: FailureCategory['type'], icon: string, label: string): FailureCategory => ({
  type,
  icon,
  label,
  matchedPattern: 'test-pattern',
  confidence: 'high',
});

describe('FailureCategoryBadge', () => {
  it('renders dependency badge', () => {
    render(<FailureCategoryBadge category={makeCategory('dependency', '🔧', 'Dependency Issue')} />);
    expect(screen.getByText('🔧')).toBeInTheDocument();
    expect(screen.getByText('Dependency Issue')).toBeInTheDocument();
  });

  it('renders infrastructure badge', () => {
    render(<FailureCategoryBadge category={makeCategory('infrastructure', '🏗️', 'Infrastructure')} />);
    expect(screen.getByText('🏗️')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
  });

  it('renders test-failure badge', () => {
    render(<FailureCategoryBadge category={makeCategory('test-failure', '🧪', 'Test Failure')} />);
    expect(screen.getByText('🧪')).toBeInTheDocument();
    expect(screen.getByText('Test Failure')).toBeInTheDocument();
  });

  it('renders timeout badge', () => {
    render(<FailureCategoryBadge category={makeCategory('timeout', '⏱️', 'Timeout')} />);
    expect(screen.getByText('⏱️')).toBeInTheDocument();
    expect(screen.getByText('Timeout')).toBeInTheDocument();
  });

  it('renders unknown badge', () => {
    render(<FailureCategoryBadge category={makeCategory('unknown', '❓', 'Unknown')} />);
    expect(screen.getByText('❓')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders compact mode (icon only, no label)', () => {
    render(<FailureCategoryBadge category={makeCategory('dependency', '🔧', 'Dependency Issue')} compact />);
    expect(screen.getByText('🔧')).toBeInTheDocument();
    expect(screen.queryByText('Dependency Issue')).not.toBeInTheDocument();
  });

  it('has correct data-category attribute', () => {
    const { container } = render(
      <FailureCategoryBadge category={makeCategory('infrastructure', '🏗️', 'Infrastructure')} />
    );
    expect(container.querySelector('[data-category="infrastructure"]')).toBeInTheDocument();
  });

  it('has tooltip with matched pattern', () => {
    const { container } = render(
      <FailureCategoryBadge category={makeCategory('dependency', '🔧', 'Dependency Issue')} />
    );
    const badge = container.querySelector('.failure-category-badge');
    expect(badge?.getAttribute('title')).toContain('test-pattern');
  });
});
