import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RefreshStatusBar from './RefreshStatusBar';

describe('RefreshStatusBar', () => {
  const defaultProps = {
    lastUpdated: new Date(),
    loading: false,
    autoRefreshInterval: 0,
    nextRefreshIn: null,
    onIntervalChange: vi.fn(),
    onManualRefresh: vi.fn(),
  };

  test('renders "No data loaded" when lastUpdated is null', () => {
    render(<RefreshStatusBar {...defaultProps} lastUpdated={null} />);
    expect(screen.getByText('No data loaded')).toBeInTheDocument();
  });

  test('renders relative time when lastUpdated is set', () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
    render(<RefreshStatusBar {...defaultProps} lastUpdated={twoMinAgo} />);
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
  });

  test('renders "just now" for very recent data', () => {
    render(<RefreshStatusBar {...defaultProps} lastUpdated={new Date()} />);
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  test('applies fresh class for recent data', () => {
    render(<RefreshStatusBar {...defaultProps} lastUpdated={new Date()} />);
    const ageText = screen.getByText('just now');
    expect(ageText.className).toContain('data-age-fresh');
  });

  test('applies aging class for 10-min-old data', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    render(<RefreshStatusBar {...defaultProps} lastUpdated={tenMinAgo} />);
    const ageText = screen.getByText('10 minutes ago');
    expect(ageText.className).toContain('data-age-aging');
  });

  test('applies stale class for 45-min-old data', () => {
    const old = new Date(Date.now() - 45 * 60 * 1000);
    render(<RefreshStatusBar {...defaultProps} lastUpdated={old} />);
    const ageText = screen.getByText('45 minutes ago');
    expect(ageText.className).toContain('data-age-stale');
  });

  test('shows loading indicator when loading', () => {
    render(<RefreshStatusBar {...defaultProps} loading={true} />);
    expect(screen.getByText('Refreshing…')).toBeInTheDocument();
  });

  test('does not show loading indicator when not loading', () => {
    render(<RefreshStatusBar {...defaultProps} loading={false} />);
    expect(screen.queryByText('Refreshing…')).not.toBeInTheDocument();
  });

  test('shows offline indicator', () => {
    render(<RefreshStatusBar {...defaultProps} isOffline={true} />);
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  test('shows rate limited indicator', () => {
    render(<RefreshStatusBar {...defaultProps} isRateLimited={true} />);
    expect(screen.getByText(/Rate limited/)).toBeInTheDocument();
  });

  test('renders interval selector with all options', () => {
    render(<RefreshStatusBar {...defaultProps} />);
    const select = screen.getByLabelText('Auto-refresh interval') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options).toHaveLength(4); // Off, 2m, 5m, 15m
  });

  test('calls onIntervalChange when selector changes', () => {
    const onIntervalChange = vi.fn();
    render(<RefreshStatusBar {...defaultProps} onIntervalChange={onIntervalChange} />);
    const select = screen.getByLabelText('Auto-refresh interval');
    fireEvent.change(select, { target: { value: '120000' } });
    expect(onIntervalChange).toHaveBeenCalledWith(120000);
  });

  test('shows countdown when auto-refresh is active', () => {
    render(
      <RefreshStatusBar
        {...defaultProps}
        autoRefreshInterval={120000}
        nextRefreshIn={45}
      />
    );
    expect(screen.getByText('Next: 45s')).toBeInTheDocument();
  });

  test('does not show countdown when loading', () => {
    render(
      <RefreshStatusBar
        {...defaultProps}
        autoRefreshInterval={120000}
        nextRefreshIn={45}
        loading={true}
      />
    );
    expect(screen.queryByText('Next: 45s')).not.toBeInTheDocument();
  });

  test('manual refresh button calls onManualRefresh', () => {
    const onManualRefresh = vi.fn();
    render(<RefreshStatusBar {...defaultProps} onManualRefresh={onManualRefresh} />);
    const btn = screen.getByLabelText('Refresh now');
    fireEvent.click(btn);
    expect(onManualRefresh).toHaveBeenCalledTimes(1);
  });

  test('manual refresh button is disabled when loading', () => {
    render(<RefreshStatusBar {...defaultProps} loading={true} />);
    const btn = screen.getByLabelText('Refresh now');
    expect(btn).toBeDisabled();
  });
});
