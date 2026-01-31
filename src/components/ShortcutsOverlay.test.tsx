import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutsOverlay from './ShortcutsOverlay';
import { SHORTCUT_DEFINITIONS, CATEGORY_LABELS } from '../utils/shortcuts';

describe('ShortcutsOverlay', () => {
  test('renders all shortcut definitions', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    // Check all shortcuts are rendered
    for (const shortcut of SHORTCUT_DEFINITIONS) {
      expect(screen.getByText(shortcut.description)).toBeInTheDocument();
      expect(screen.getByText(shortcut.keyDisplay)).toBeInTheDocument();
    }
  });

  test('renders all three category groups', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    expect(screen.getByText(CATEGORY_LABELS.navigation)).toBeInTheDocument();
    expect(screen.getByText(CATEGORY_LABELS.actions)).toBeInTheDocument();
    expect(screen.getByText(CATEGORY_LABELS.projects)).toBeInTheDocument();
  });

  test('renders correct number of shortcuts', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    const kbdElements = screen.getAllByText((_, element) => element?.tagName === 'KBD');
    expect(kbdElements).toHaveLength(SHORTCUT_DEFINITIONS.length);
  });

  test('has dialog role and aria-modal', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Keyboard Shortcuts');
  });

  test('closes via close button', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('closes via backdrop click', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    const backdrop = screen.getByTestId('shortcuts-overlay-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not close when clicking inside the overlay', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  test('closes via Escape key', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('renders title', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });
});
