import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationSettings from './NotificationSettings';
import { NotificationRule, Project } from '../types';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'Test Project',
    web_url: 'https://gitlab.com/test',
    metrics: {
      totalPipelines: 10,
      successfulPipelines: 8,
      failedPipelines: 2,
      canceledPipelines: 0,
      runningPipelines: 0,
      successRate: 80,
      avgDuration: 120,
      testMetrics: { total: 50, success: 48, failed: 2, skipped: 0, available: true },
      mainBranchPipeline: { id: 100, status: 'success', created_at: '', updated_at: '' },
      codeCoverage: { coverage: 85, available: true },
      mergeRequestCounts: { totalOpen: 3, drafts: 1 },
      recentCommits: [],
    },
    ...overrides,
  };
}

describe('NotificationSettings', () => {
  const defaultProps = {
    enabled: false,
    muted: false,
    rules: [] as NotificationRule[],
    projects: [makeProject()] as Project[],
    onToggleEnabled: vi.fn(),
    onToggleMuted: vi.fn(),
    onAddRule: vi.fn(),
    onUpdateRule: vi.fn(),
    onDeleteRule: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock Notification API
    const mockNotification = vi.fn() as unknown as typeof Notification;
    Object.defineProperty(mockNotification, 'permission', {
      value: 'default',
      writable: true,
      configurable: true,
    });
    mockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('Notification', mockNotification);
  });

  test('renders notifications title', () => {
    render(<NotificationSettings {...defaultProps} />);
    expect(screen.getByText('🔔 Notifications')).toBeInTheDocument();
  });

  test('shows enable toggle', () => {
    render(<NotificationSettings {...defaultProps} />);
    expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();
  });

  test('shows permission not requested when default', () => {
    render(<NotificationSettings {...defaultProps} />);
    expect(screen.getByText(/Permission not requested/)).toBeInTheDocument();
  });

  test('shows permission granted status', () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });
    render(<NotificationSettings {...defaultProps} enabled={true} />);
    expect(screen.getByText(/Permission granted/)).toBeInTheDocument();
  });

  test('shows permission denied status with help text', () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'denied',
      configurable: true,
    });
    render(<NotificationSettings {...defaultProps} />);
    expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
    expect(screen.getByText(/Enable notifications in your browser settings/)).toBeInTheDocument();
  });

  test('shows rule list when enabled', () => {
    const rules: NotificationRule[] = [
      {
        id: 'r1',
        type: 'pipeline-failure',
        name: 'Pipeline Failure Alert',
        enabled: true,
        scope: 'all',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });
    render(<NotificationSettings {...defaultProps} enabled={true} rules={rules} />);
    expect(screen.getByText('Pipeline Failure Alert')).toBeInTheDocument();
    expect(screen.getByText('1 / 20 rules')).toBeInTheDocument();
  });

  test('shows Add Rule button when enabled', () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });
    render(<NotificationSettings {...defaultProps} enabled={true} />);
    expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
  });

  test('opens rule form when Add Rule clicked', () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });
    render(<NotificationSettings {...defaultProps} enabled={true} />);
    fireEvent.click(screen.getByText('+ Add Rule'));
    expect(screen.getByLabelText('Rule Type')).toBeInTheDocument();
  });

  test('shows mute toggle when enabled', () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });
    render(<NotificationSettings {...defaultProps} enabled={true} />);
    expect(screen.getByLabelText('Toggle notification sound')).toBeInTheDocument();
  });

  test('calls onToggleMuted when mute toggled', () => {
    const onToggleMuted = vi.fn();
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });
    render(<NotificationSettings {...defaultProps} enabled={true} onToggleMuted={onToggleMuted} />);
    fireEvent.click(screen.getByLabelText('Toggle notification sound'));
    expect(onToggleMuted).toHaveBeenCalled();
  });

  test('calls onDeleteRule when Delete clicked', () => {
    const onDeleteRule = vi.fn();
    const rules: NotificationRule[] = [
      { id: 'r1', type: 'pipeline-failure', name: 'Alert', enabled: true, scope: 'all', createdAt: '2026-01-01T00:00:00Z' },
    ];
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<NotificationSettings {...defaultProps} enabled={true} rules={rules} onDeleteRule={onDeleteRule} />);

    fireEvent.click(screen.getByTitle('Delete rule'));
    expect(onDeleteRule).toHaveBeenCalledWith('r1');
  });

  test('calls onUpdateRule to toggle rule enabled', () => {
    const onUpdateRule = vi.fn();
    const rules: NotificationRule[] = [
      { id: 'r1', type: 'pipeline-failure', name: 'Alert', enabled: true, scope: 'all', createdAt: '2026-01-01T00:00:00Z' },
    ];
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });
    render(<NotificationSettings {...defaultProps} enabled={true} rules={rules} onUpdateRule={onUpdateRule} />);

    // The per-rule toggle
    fireEvent.click(screen.getByLabelText('Toggle rule: Alert'));
    expect(onUpdateRule).toHaveBeenCalledWith('r1', { enabled: false });
  });

  test('shows unsupported message when Notification not available', () => {
    vi.unstubAllGlobals();
    // @ts-expect-error - intentionally removing Notification for testing
    delete window.Notification;
    render(<NotificationSettings {...defaultProps} />);
    expect(screen.getByText(/not supported/)).toBeInTheDocument();
  });

  test('does not show rule list or mute when disabled', () => {
    render(<NotificationSettings {...defaultProps} enabled={false} />);
    expect(screen.queryByText('+ Add Rule')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Toggle notification sound')).not.toBeInTheDocument();
  });
});
