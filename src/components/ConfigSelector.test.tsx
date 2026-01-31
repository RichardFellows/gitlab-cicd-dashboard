import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfigSelector from './ConfigSelector';
import { SavedConfigEntry, DashboardConfig } from '../types';

const mockConfig: DashboardConfig = {
  version: 1,
  gitlabUrl: 'https://gitlab.com',
  token: 'test-token',
  timeframe: 30,
  groups: [],
  projects: [],
};

const mockConfigs: SavedConfigEntry[] = [
  {
    id: 'cfg_1',
    name: 'My Team',
    config: mockConfig,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cfg_2',
    name: 'Prod Monitoring',
    config: { ...mockConfig, timeframe: 90 },
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

const createMockProps = (overrides = {}) => ({
  savedConfigs: mockConfigs,
  activeConfigId: null as string | null,
  currentConfig: mockConfig,
  hasUnsavedChanges: false,
  onSelectConfig: vi.fn(),
  onSaveConfig: vi.fn(),
  onUpdateConfig: vi.fn(),
  onManageConfigs: vi.fn(),
  disabled: false,
  ...overrides,
});

describe('ConfigSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders dropdown with saved configs', () => {
    render(<ConfigSelector {...createMockProps()} />);
    expect(screen.getByText('— Select configuration —')).toBeInTheDocument();
    expect(screen.getByText('My Team')).toBeInTheDocument();
    expect(screen.getByText('Prod Monitoring')).toBeInTheDocument();
  });

  test('shows empty state when no configs saved', () => {
    render(<ConfigSelector {...createMockProps({ savedConfigs: [] })} />);
    expect(screen.getByText('No saved configurations')).toBeInTheDocument();
  });

  test('fires onSelectConfig when dropdown changes', () => {
    const props = createMockProps();
    render(<ConfigSelector {...props} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cfg_1' } });
    expect(props.onSelectConfig).toHaveBeenCalledWith('cfg_1');
  });

  test('shows Save As button when no active config', () => {
    render(<ConfigSelector {...createMockProps()} />);
    expect(screen.getByText('💾 Save As')).toBeInTheDocument();
  });

  test('shows Save button when active config exists', () => {
    render(<ConfigSelector {...createMockProps({ activeConfigId: 'cfg_1' })} />);
    expect(screen.getByText('💾 Save')).toBeInTheDocument();
  });

  test('fires onSaveConfig for Save As', () => {
    const props = createMockProps();
    render(<ConfigSelector {...props} />);
    fireEvent.click(screen.getByText('💾 Save As'));
    expect(props.onSaveConfig).toHaveBeenCalled();
  });

  test('fires onUpdateConfig for Save', () => {
    const props = createMockProps({ activeConfigId: 'cfg_1' });
    render(<ConfigSelector {...props} />);
    fireEvent.click(screen.getByText('💾 Save'));
    expect(props.onUpdateConfig).toHaveBeenCalled();
  });

  test('fires onManageConfigs when Manage button clicked', () => {
    const props = createMockProps();
    render(<ConfigSelector {...props} />);
    fireEvent.click(screen.getByText('⚙️ Manage'));
    expect(props.onManageConfigs).toHaveBeenCalled();
  });

  test('shows unsaved changes indicator', () => {
    render(
      <ConfigSelector
        {...createMockProps({ activeConfigId: 'cfg_1', hasUnsavedChanges: true })}
      />
    );
    expect(screen.getByTitle('Unsaved changes')).toBeInTheDocument();
  });

  test('does not show unsaved indicator without active config', () => {
    render(
      <ConfigSelector
        {...createMockProps({ hasUnsavedChanges: true })}
      />
    );
    expect(screen.queryByTitle('Unsaved changes')).not.toBeInTheDocument();
  });

  test('disables controls when disabled prop is true', () => {
    render(<ConfigSelector {...createMockProps({ disabled: true })} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByText('💾 Save As')).toBeDisabled();
    expect(screen.getByText('⚙️ Manage')).toBeDisabled();
  });
});
