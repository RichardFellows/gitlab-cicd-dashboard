import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationBell from './NotificationBell';
import { NotificationEntry } from '../types';

function makeEntry(overrides: Partial<NotificationEntry> = {}): NotificationEntry {
  return {
    id: `e_${Math.random()}`,
    ruleId: 'r1',
    ruleName: 'Pipeline Failure',
    ruleType: 'pipeline-failure',
    projectId: 1,
    projectName: 'MyApp',
    message: 'Main branch pipeline failed',
    value: 0,
    timestamp: new Date().toISOString(),
    read: false,
    ...overrides,
  };
}

describe('NotificationBell', () => {
  const defaultProps = {
    history: [] as NotificationEntry[],
    unreadCount: 0,
    onMarkAllRead: vi.fn(),
    onClickEntry: vi.fn(),
    darkMode: false,
  };

  test('renders bell button', () => {
    render(<NotificationBell {...defaultProps} />);
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
  });

  test('shows badge when unread count > 0', () => {
    render(<NotificationBell {...defaultProps} unreadCount={5} />);
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('5');
  });

  test('does not show badge when unread count is 0', () => {
    render(<NotificationBell {...defaultProps} unreadCount={0} />);
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  test('shows 99+ for counts over 99', () => {
    render(<NotificationBell {...defaultProps} unreadCount={150} />);
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('99+');
  });

  test('opens dropdown on bell click', () => {
    render(<NotificationBell {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  test('shows notification entries in dropdown', () => {
    const entries = [
      makeEntry({ id: 'e1', projectName: 'ProjectA', message: 'Pipeline failed' }),
      makeEntry({ id: 'e2', projectName: 'ProjectB', message: 'Coverage dropped to 70%', ruleType: 'coverage-drop' }),
    ];
    render(<NotificationBell {...defaultProps} history={entries} unreadCount={2} />);
    fireEvent.click(screen.getByTitle('Notifications'));

    expect(screen.getByText('ProjectA')).toBeInTheDocument();
    expect(screen.getByText('ProjectB')).toBeInTheDocument();
  });

  test('calls onClickEntry when entry clicked', () => {
    const onClickEntry = vi.fn();
    const entry = makeEntry({ id: 'e1' });
    render(<NotificationBell {...defaultProps} history={[entry]} unreadCount={1} onClickEntry={onClickEntry} />);

    fireEvent.click(screen.getByTitle('Notifications'));
    // Click the entry
    fireEvent.click(screen.getByText('MyApp'));
    expect(onClickEntry).toHaveBeenCalledWith(entry);
  });

  test('shows Mark all read button when unread > 0', () => {
    const onMarkAllRead = vi.fn();
    render(
      <NotificationBell
        {...defaultProps}
        history={[makeEntry()]}
        unreadCount={1}
        onMarkAllRead={onMarkAllRead}
      />
    );
    fireEvent.click(screen.getByTitle('Notifications'));
    const markAllBtn = screen.getByText('Mark all read');
    expect(markAllBtn).toBeInTheDocument();

    fireEvent.click(markAllBtn);
    expect(onMarkAllRead).toHaveBeenCalled();
  });

  test('does not show Mark all read button when unread is 0', () => {
    render(
      <NotificationBell
        {...defaultProps}
        history={[makeEntry({ read: true })]}
        unreadCount={0}
      />
    );
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
  });

  test('closes dropdown on outside click', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <NotificationBell {...defaultProps} />
      </div>
    );
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('No notifications')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('No notifications')).not.toBeInTheDocument();
  });
});
