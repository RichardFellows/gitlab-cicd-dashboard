import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ControlPanel from './ControlPanel';
import { GroupSource, ProjectSource } from '../types';

// Mock props
const createMockProps = (overrides = {}) => ({
  gitlabUrl: 'https://gitlab.com',
  token: 'test-token',
  groups: [{ id: '12345', name: 'test-group', addedAt: new Date().toISOString() }] as GroupSource[],
  projects: [] as ProjectSource[],
  timeframe: 30,
  onGitlabUrlChange: vi.fn(),
  onTokenChange: vi.fn(),
  onAddGroup: vi.fn(),
  onRemoveGroup: vi.fn(),
  onAddProject: vi.fn(),
  onRemoveProject: vi.fn(),
  onTimeframeChange: vi.fn(),
  onLoad: vi.fn(),
  loading: false,
  loadingGroups: new Set<string>(),
  loadingProjects: new Set<string>(),
  canLoad: true,
  ...overrides
});

describe('ControlPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders with provided props', () => {
    const mockProps = createMockProps();
    render(<ControlPanel {...mockProps} />);

    // Check that inputs have the correct values
    expect(screen.getByLabelText('GitLab Instance URL')).toHaveValue('https://gitlab.com');
    expect(screen.getByLabelText('GitLab Private Token')).toHaveValue('test-token');

    // Check timeframe select
    const timeframeSelect = screen.getByLabelText('Timeframe') as HTMLSelectElement;
    expect(timeframeSelect.value).toBe('30');

    // Check that group chip is displayed
    expect(screen.getByText('test-group')).toBeInTheDocument();
  });

  test('calls change handlers when inputs change', () => {
    const mockProps = createMockProps();
    render(<ControlPanel {...mockProps} />);

    // Change GitLab URL
    fireEvent.change(screen.getByLabelText('GitLab Instance URL'), {
      target: { value: 'https://custom-gitlab.com' }
    });
    expect(mockProps.onGitlabUrlChange).toHaveBeenCalledWith('https://custom-gitlab.com');

    // Change token
    fireEvent.change(screen.getByLabelText('GitLab Private Token'), {
      target: { value: 'new-token' }
    });
    expect(mockProps.onTokenChange).toHaveBeenCalledWith('new-token');

    // Change timeframe
    fireEvent.change(screen.getByLabelText('Timeframe'), {
      target: { value: '90' }
    });
    expect(mockProps.onTimeframeChange).toHaveBeenCalledWith(90);
  });

  test('calls onLoad when form is submitted', () => {
    const mockProps = createMockProps();
    render(<ControlPanel {...mockProps} />);

    // Submit the form by clicking the button
    fireEvent.click(screen.getByText('Load Dashboard'));

    // Check that onLoad was called
    expect(mockProps.onLoad).toHaveBeenCalled();
  });

  test('disables form when loading is true', () => {
    const mockProps = createMockProps({ loading: true });
    render(<ControlPanel {...mockProps} />);

    // Check that inputs are disabled
    expect(screen.getByLabelText('GitLab Instance URL')).toBeDisabled();
    expect(screen.getByLabelText('GitLab Private Token')).toBeDisabled();
    expect(screen.getByLabelText('Timeframe')).toBeDisabled();

    // Check that button is disabled
    expect(screen.getByText('Loading...')).toBeDisabled();
  });

  test('shows loading button text when loading', () => {
    const mockProps = createMockProps({ loading: true });
    render(<ControlPanel {...mockProps} />);

    // Check that the button text changes
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Load Dashboard')).not.toBeInTheDocument();
  });

  test('disables submit when canLoad is false', () => {
    const mockProps = createMockProps({
      canLoad: false,
      groups: [],
      token: ''
    });
    render(<ControlPanel {...mockProps} />);

    // Check that button is disabled
    const submitButton = screen.getByRole('button', { name: 'Load Dashboard' });
    expect(submitButton).toBeDisabled();

    // Check that hint is shown
    expect(screen.getByText(/Add at least one group or project/)).toBeInTheDocument();
  });

  test('shows empty state for groups', () => {
    const mockProps = createMockProps({ groups: [] });
    render(<ControlPanel {...mockProps} />);

    // Check that empty state is shown
    expect(screen.getByText('No groups added')).toBeInTheDocument();
  });

  test('shows empty state for projects', () => {
    const mockProps = createMockProps({ projects: [] });
    render(<ControlPanel {...mockProps} />);

    // Check that empty state is shown
    expect(screen.getByText('No projects added')).toBeInTheDocument();
  });

  test('displays multiple groups as chips', () => {
    const mockProps = createMockProps({
      groups: [
        { id: '111', name: 'group-one', addedAt: new Date().toISOString() },
        { id: '222', name: 'group-two', addedAt: new Date().toISOString() }
      ]
    });
    render(<ControlPanel {...mockProps} />);

    expect(screen.getByText('group-one')).toBeInTheDocument();
    expect(screen.getByText('group-two')).toBeInTheDocument();
  });
});
