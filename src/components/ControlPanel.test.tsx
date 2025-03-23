import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ControlPanel from './ControlPanel';

// Mock props
const mockProps = {
  gitlabUrl: 'https://gitlab.com/api/v4',
  token: 'test-token',
  groupId: '12345',
  timeframe: 30,
  onGitlabUrlChange: vi.fn(),
  onTokenChange: vi.fn(),
  onGroupIdChange: vi.fn(),
  onTimeframeChange: vi.fn(),
  onLoad: vi.fn(),
  loading: false
};

describe('ControlPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders with provided props', () => {
    render(<ControlPanel {...mockProps} />);
    
    // Check that inputs have the correct values
    expect(screen.getByLabelText('GitLab Instance URL')).toHaveValue('https://gitlab.com/api/v4');
    expect(screen.getByLabelText('GitLab Private Token')).toHaveValue('test-token');
    expect(screen.getByLabelText('GitLab Group ID')).toHaveValue('12345');
    
    // Check timeframe select
    const timeframeSelect = screen.getByLabelText('Timeframe') as HTMLSelectElement;
    expect(timeframeSelect.value).toBe('30');
  });

  test('calls change handlers when inputs change', () => {
    render(<ControlPanel {...mockProps} />);
    
    // Change GitLab URL
    fireEvent.change(screen.getByLabelText('GitLab Instance URL'), {
      target: { value: 'https://custom-gitlab.com/api/v4' }
    });
    expect(mockProps.onGitlabUrlChange).toHaveBeenCalledWith('https://custom-gitlab.com/api/v4');
    
    // Change token
    fireEvent.change(screen.getByLabelText('GitLab Private Token'), {
      target: { value: 'new-token' }
    });
    expect(mockProps.onTokenChange).toHaveBeenCalledWith('new-token');
    
    // Change group ID
    fireEvent.change(screen.getByLabelText('GitLab Group ID'), {
      target: { value: '67890' }
    });
    expect(mockProps.onGroupIdChange).toHaveBeenCalledWith('67890');
    
    // Change timeframe
    fireEvent.change(screen.getByLabelText('Timeframe'), {
      target: { value: '90' }
    });
    expect(mockProps.onTimeframeChange).toHaveBeenCalledWith(90);
  });

  test('calls onLoad when form is submitted', () => {
    render(<ControlPanel {...mockProps} />);
    
    // Submit the form by clicking the button
    fireEvent.click(screen.getByText('Load Dashboard'));
    
    // Check that onLoad was called with the correct params
    expect(mockProps.onLoad).toHaveBeenCalledWith(
      'https://gitlab.com/api/v4',
      'test-token',
      '12345',
      30
    );
  });

  test('disables form when loading is true', () => {
    render(<ControlPanel {...mockProps} loading={true} />);
    
    // Check that all inputs are disabled
    expect(screen.getByLabelText('GitLab Instance URL')).toBeDisabled();
    expect(screen.getByLabelText('GitLab Private Token')).toBeDisabled();
    expect(screen.getByLabelText('GitLab Group ID')).toBeDisabled();
    expect(screen.getByLabelText('Timeframe')).toBeDisabled();
    
    // Check that button is disabled
    expect(screen.getByText('Loading...')).toBeDisabled();
  });

  test('shows loading button text when loading', () => {
    render(<ControlPanel {...mockProps} loading={true} />);
    
    // Check that the button text changes
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Load Dashboard')).not.toBeInTheDocument();
  });

  test('prevents form submission if required fields are missing', () => {
    // Render with empty token and group ID
    render(
      <ControlPanel 
        {...mockProps} 
        token="" 
        groupId="" 
      />
    );
    
    // Submit the form
    fireEvent.click(screen.getByText('Load Dashboard'));
    
    // Check that onLoad was NOT called
    expect(mockProps.onLoad).not.toHaveBeenCalled();
  });
});