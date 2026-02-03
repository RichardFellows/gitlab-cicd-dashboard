import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StaleDataBanner from './StaleDataBanner';

describe('StaleDataBanner', () => {
  const defaultProps = {
    lastUpdated: null as Date | null,
    autoRefreshEnabled: false,
    onRefreshNow: vi.fn(),
    onEnableAutoRefresh: vi.fn(),
    onDismiss: vi.fn(),
  };

  test('does not render when lastUpdated is null', () => {
    const { container } = render(<StaleDataBanner {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });

  test('does not render when data is fresh', () => {
    const { container } = render(
      <StaleDataBanner {...defaultProps} lastUpdated={new Date()} />
    );
    expect(container.innerHTML).toBe('');
  });

  test('does not render when auto-refresh is enabled (even if stale)', () => {
    const old = new Date(Date.now() - 45 * 60 * 1000);
    const { container } = render(
      <StaleDataBanner {...defaultProps} lastUpdated={old} autoRefreshEnabled={true} />
    );
    expect(container.innerHTML).toBe('');
  });

  test('renders when data is stale and auto-refresh is off', () => {
    const old = new Date(Date.now() - 45 * 60 * 1000);
    render(
      <StaleDataBanner {...defaultProps} lastUpdated={old} autoRefreshEnabled={false} />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Refresh now or enable auto-refresh/)).toBeInTheDocument();
  });

  test('includes relative time in message', () => {
    const old = new Date(Date.now() - 45 * 60 * 1000);
    render(
      <StaleDataBanner {...defaultProps} lastUpdated={old} autoRefreshEnabled={false} />
    );
    expect(screen.getByText(/45 minutes ago/)).toBeInTheDocument();
  });

  test('Refresh Now button fires callback', () => {
    const onRefreshNow = vi.fn();
    const old = new Date(Date.now() - 45 * 60 * 1000);
    render(
      <StaleDataBanner {...defaultProps} lastUpdated={old} onRefreshNow={onRefreshNow} />
    );
    fireEvent.click(screen.getByText('Refresh Now'));
    expect(onRefreshNow).toHaveBeenCalledTimes(1);
  });

  test('Enable Auto-Refresh button fires callback', () => {
    const onEnableAutoRefresh = vi.fn();
    const old = new Date(Date.now() - 45 * 60 * 1000);
    render(
      <StaleDataBanner {...defaultProps} lastUpdated={old} onEnableAutoRefresh={onEnableAutoRefresh} />
    );
    fireEvent.click(screen.getByText('Enable Auto-Refresh'));
    expect(onEnableAutoRefresh).toHaveBeenCalledTimes(1);
  });

  test('Dismiss button fires callback', () => {
    const onDismiss = vi.fn();
    const old = new Date(Date.now() - 45 * 60 * 1000);
    render(
      <StaleDataBanner {...defaultProps} lastUpdated={old} onDismiss={onDismiss} />
    );
    fireEvent.click(screen.getByLabelText('Dismiss stale data warning'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('does not render for aging data (e.g. 15 min)', () => {
    const aging = new Date(Date.now() - 15 * 60 * 1000);
    const { container } = render(
      <StaleDataBanner {...defaultProps} lastUpdated={aging} />
    );
    expect(container.innerHTML).toBe('');
  });
});
