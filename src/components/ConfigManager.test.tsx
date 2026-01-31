import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigManager from './ConfigManager';
import { SavedConfigEntry, DashboardConfig } from '../types';

const mockConfig: DashboardConfig = {
  version: 1,
  gitlabUrl: 'https://gitlab.com',
  token: 'test-token',
  timeframe: 30,
  groups: [{ id: '123', name: 'my-group', addedAt: '2026-01-01T00:00:00Z' }],
  projects: [{ id: '456', name: 'my-project', addedAt: '2026-01-01T00:00:00Z' }],
};

const mockConfigs: SavedConfigEntry[] = [
  {
    id: 'cfg_1',
    name: 'My Team',
    config: mockConfig,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'cfg_2',
    name: 'Prod Monitoring',
    config: { ...mockConfig, groups: [], projects: [] },
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
  },
];

const createMockProps = (overrides = {}) => ({
  savedConfigs: mockConfigs,
  activeConfigId: 'cfg_1',
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onExport: vi.fn(),
  onImport: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

describe('ConfigManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders config list', () => {
    render(<ConfigManager {...createMockProps()} />);
    expect(screen.getByText('Manage Configurations')).toBeInTheDocument();
    expect(screen.getByText('My Team')).toBeInTheDocument();
    expect(screen.getByText('Prod Monitoring')).toBeInTheDocument();
  });

  test('shows active badge on active config', () => {
    render(<ConfigManager {...createMockProps()} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('shows empty state when no configs', () => {
    render(<ConfigManager {...createMockProps({ savedConfigs: [] })} />);
    expect(screen.getByText(/No saved configurations/)).toBeInTheDocument();
  });

  test('shows groups and projects count', () => {
    render(<ConfigManager {...createMockProps()} />);
    expect(screen.getByText(/1 group, 1 project/)).toBeInTheDocument();
    expect(screen.getByText(/0 groups, 0 projects/)).toBeInTheDocument();
  });

  test('shows rename input on rename click', () => {
    render(<ConfigManager {...createMockProps()} />);
    const renameButtons = screen.getAllByText('Rename');
    fireEvent.click(renameButtons[0]);

    expect(screen.getByDisplayValue('My Team')).toBeInTheDocument();
  });

  test('calls onRename on Enter in rename input', () => {
    const props = createMockProps();
    render(<ConfigManager {...props} />);

    const renameButtons = screen.getAllByText('Rename');
    fireEvent.click(renameButtons[0]);

    const input = screen.getByDisplayValue('My Team');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(props.onRename).toHaveBeenCalledWith('cfg_1', 'New Name');
  });

  test('calls onDelete with confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const props = createMockProps();
    render(<ConfigManager {...props} />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('My Team'));
    expect(props.onDelete).toHaveBeenCalledWith('cfg_1');
    confirmSpy.mockRestore();
  });

  test('does not delete when confirmation rejected', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const props = createMockProps();
    render(<ConfigManager {...props} />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(props.onDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('calls onExport with token choice from confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const props = createMockProps();
    render(<ConfigManager {...props} />);

    const exportButtons = screen.getAllByText('Export');
    fireEvent.click(exportButtons[0]);

    expect(props.onExport).toHaveBeenCalledWith('cfg_1', false);
    confirmSpy.mockRestore();
  });

  test('calls onClose when Close button clicked', () => {
    const props = createMockProps();
    render(<ConfigManager {...props} />);

    fireEvent.click(screen.getByText('Close'));
    expect(props.onClose).toHaveBeenCalled();
  });

  test('calls onClose when overlay clicked', () => {
    const props = createMockProps();
    render(<ConfigManager {...props} />);

    fireEvent.click(screen.getByText('Manage Configurations').closest('.config-modal-overlay')!);
    expect(props.onClose).toHaveBeenCalled();
  });

  test('shows import section', () => {
    render(<ConfigManager {...createMockProps()} />);
    expect(screen.getByText('Import Configuration')).toBeInTheDocument();
    expect(screen.getByText('📂 Choose File to Import')).toBeInTheDocument();
  });
});
