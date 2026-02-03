import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SaveConfigDialog from './SaveConfigDialog';

const createMockProps = (overrides = {}) => ({
  existingNames: ['Existing Config'],
  defaultName: '',
  onSave: vi.fn(),
  onCancel: vi.fn(),
  ...overrides,
});

describe('SaveConfigDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders with input and buttons', () => {
    render(<SaveConfigDialog {...createMockProps()} />);
    expect(screen.getByText('Save Configuration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g., My Team/)).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('populates default name', () => {
    render(<SaveConfigDialog {...createMockProps({ defaultName: 'My Team' })} />);
    expect(screen.getByDisplayValue('My Team')).toBeInTheDocument();
  });

  test('fires onSave with entered name', () => {
    const props = createMockProps();
    render(<SaveConfigDialog {...props} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g., My Team/), {
      target: { value: 'New Config' },
    });
    fireEvent.click(screen.getByText('Save'));
    expect(props.onSave).toHaveBeenCalledWith('New Config');
  });

  test('shows error on empty name', () => {
    const props = createMockProps();
    render(<SaveConfigDialog {...props} />);

    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Please enter a configuration name.')).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  test('fires onCancel when Cancel clicked', () => {
    const props = createMockProps();
    render(<SaveConfigDialog {...props} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onCancel).toHaveBeenCalled();
  });

  test('fires onCancel when overlay clicked', () => {
    const props = createMockProps();
    render(<SaveConfigDialog {...props} />);

    // Click the overlay (outermost div)
    fireEvent.click(screen.getByText('Save Configuration').closest('.config-modal-overlay')!);
    expect(props.onCancel).toHaveBeenCalled();
  });

  test('submits on Enter key', () => {
    const props = createMockProps();
    render(<SaveConfigDialog {...props} />);

    const input = screen.getByPlaceholderText(/e.g., My Team/);
    fireEvent.change(input, { target: { value: 'Enter Config' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onSave).toHaveBeenCalledWith('Enter Config');
  });

  test('cancels on Escape key', () => {
    const props = createMockProps();
    render(<SaveConfigDialog {...props} />);

    const input = screen.getByPlaceholderText(/e.g., My Team/);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(props.onCancel).toHaveBeenCalled();
  });

  test('warns on duplicate name via window.confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const props = createMockProps();
    render(<SaveConfigDialog {...props} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g., My Team/), {
      target: { value: 'Existing Config' },
    });
    fireEvent.click(screen.getByText('Save'));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('already exists')
    );
    expect(props.onSave).toHaveBeenCalledWith('Existing Config');
    confirmSpy.mockRestore();
  });

  test('does not save when duplicate is rejected', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const props = createMockProps();
    render(<SaveConfigDialog {...props} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g., My Team/), {
      target: { value: 'Existing Config' },
    });
    fireEvent.click(screen.getByText('Save'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
