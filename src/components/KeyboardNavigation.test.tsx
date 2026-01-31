import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FC, useState } from 'react';
import { useKeyboardShortcuts, ShortcutHandler } from '../hooks/useKeyboardShortcuts';

/**
 * Integration tests for keyboard navigation.
 * Uses a lightweight test harness that exercises the hook with real DOM interactions.
 */

interface TestProject {
  id: number;
  name: string;
}

const testProjects: TestProject[] = [
  { id: 1, name: 'Project Alpha' },
  { id: 2, name: 'Project Beta' },
  { id: 3, name: 'Project Gamma' },
];

/** Minimal test component that wires up keyboard shortcuts like App.tsx */
const TestHarness: FC<{
  projects: TestProject[];
  onProjectSelect?: (id: number) => void;
  onViewChange?: (view: string) => void;
  onRefresh?: () => void;
  onDarkModeToggle?: () => void;
}> = ({
  projects,
  onProjectSelect = vi.fn(),
  onViewChange = vi.fn(),
  onRefresh = vi.fn(),
  onDarkModeToggle = vi.fn(),
}) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showOverlay, setShowOverlay] = useState(false);

  const shortcuts: ShortcutHandler[] = [
    { key: '1', handler: () => onViewChange('card') },
    { key: '2', handler: () => onViewChange('table') },
    { key: 'r', handler: () => onRefresh() },
    { key: 'd', handler: () => onDarkModeToggle() },
    { key: '?', handler: () => setShowOverlay(true) },
    {
      key: 'j',
      handler: () => {
        setSelectedIndex(prev => {
          const max = projects.length - 1;
          return prev >= max ? 0 : prev + 1;
        });
      },
    },
    {
      key: 'k',
      handler: () => {
        setSelectedIndex(prev => {
          const max = projects.length - 1;
          return prev <= 0 ? max : prev - 1;
        });
      },
    },
    {
      key: 'Enter',
      handler: () => {
        if (selectedIndex >= 0 && projects[selectedIndex]) {
          onProjectSelect(projects[selectedIndex].id);
        }
      },
    },
    {
      key: 'Escape',
      handler: () => {
        if (showOverlay) {
          setShowOverlay(false);
        } else {
          setSelectedIndex(-1);
        }
      },
    },
  ];

  useKeyboardShortcuts({ enabled: true, shortcuts });

  return (
    <div>
      <input id="search-input" data-testid="search-input" placeholder="Search..." />
      <div data-testid="selected-index">{selectedIndex}</div>
      <div data-testid="overlay-visible">{showOverlay ? 'true' : 'false'}</div>
      <ul>
        {projects.map((p, i) => (
          <li
            key={p.id}
            data-testid={`project-${p.id}`}
            className={i === selectedIndex ? 'keyboard-selected' : ''}
          >
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('Keyboard Navigation Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('j key moves selection down', () => {
    render(<TestHarness projects={testProjects} />);

    expect(screen.getByTestId('selected-index').textContent).toBe('-1');

    fireEvent.keyDown(document, { key: 'j' });
    expect(screen.getByTestId('selected-index').textContent).toBe('0');

    fireEvent.keyDown(document, { key: 'j' });
    expect(screen.getByTestId('selected-index').textContent).toBe('1');

    fireEvent.keyDown(document, { key: 'j' });
    expect(screen.getByTestId('selected-index').textContent).toBe('2');
  });

  test('k key moves selection up', () => {
    render(<TestHarness projects={testProjects} />);

    // First move down to index 2, then k should go to 1
    fireEvent.keyDown(document, { key: 'j' });
    fireEvent.keyDown(document, { key: 'j' });
    fireEvent.keyDown(document, { key: 'j' });
    expect(screen.getByTestId('selected-index').textContent).toBe('2');

    fireEvent.keyDown(document, { key: 'k' });
    expect(screen.getByTestId('selected-index').textContent).toBe('1');

    fireEvent.keyDown(document, { key: 'k' });
    expect(screen.getByTestId('selected-index').textContent).toBe('0');
  });

  test('j wraps around from last to first', () => {
    render(<TestHarness projects={testProjects} />);

    // Move to last
    fireEvent.keyDown(document, { key: 'j' }); // 0
    fireEvent.keyDown(document, { key: 'j' }); // 1
    fireEvent.keyDown(document, { key: 'j' }); // 2
    fireEvent.keyDown(document, { key: 'j' }); // wraps to 0
    expect(screen.getByTestId('selected-index').textContent).toBe('0');
  });

  test('k wraps around from first to last', () => {
    render(<TestHarness projects={testProjects} />);

    // From -1, k should go to last (wrap)
    fireEvent.keyDown(document, { key: 'k' });
    expect(screen.getByTestId('selected-index').textContent).toBe('2');
  });

  test('Enter opens selected project', () => {
    const onProjectSelect = vi.fn();
    render(<TestHarness projects={testProjects} onProjectSelect={onProjectSelect} />);

    // Select first project, then Enter
    fireEvent.keyDown(document, { key: 'j' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onProjectSelect).toHaveBeenCalledWith(1);
  });

  test('Enter does nothing when no project selected', () => {
    const onProjectSelect = vi.fn();
    render(<TestHarness projects={testProjects} onProjectSelect={onProjectSelect} />);

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onProjectSelect).not.toHaveBeenCalled();
  });

  test('Escape clears selection', () => {
    render(<TestHarness projects={testProjects} />);

    fireEvent.keyDown(document, { key: 'j' });
    expect(screen.getByTestId('selected-index').textContent).toBe('0');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('selected-index').textContent).toBe('-1');
  });

  test('? opens shortcuts overlay', () => {
    render(<TestHarness projects={testProjects} />);

    expect(screen.getByTestId('overlay-visible').textContent).toBe('false');

    fireEvent.keyDown(document, { key: '?' });
    expect(screen.getByTestId('overlay-visible').textContent).toBe('true');
  });

  test('Escape closes overlay before clearing selection', () => {
    render(<TestHarness projects={testProjects} />);

    // Open overlay
    fireEvent.keyDown(document, { key: '?' });
    expect(screen.getByTestId('overlay-visible').textContent).toBe('true');

    // Escape closes overlay
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('overlay-visible').textContent).toBe('false');
  });

  test('1-2 keys switch views', () => {
    const onViewChange = vi.fn();
    render(<TestHarness projects={testProjects} onViewChange={onViewChange} />);

    fireEvent.keyDown(document, { key: '1' });
    expect(onViewChange).toHaveBeenCalledWith('card');

    fireEvent.keyDown(document, { key: '2' });
    expect(onViewChange).toHaveBeenCalledWith('table');
  });

  test('r key triggers refresh', () => {
    const onRefresh = vi.fn();
    render(<TestHarness projects={testProjects} onRefresh={onRefresh} />);

    fireEvent.keyDown(document, { key: 'r' });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('d key toggles dark mode', () => {
    const onDarkModeToggle = vi.fn();
    render(<TestHarness projects={testProjects} onDarkModeToggle={onDarkModeToggle} />);

    fireEvent.keyDown(document, { key: 'd' });
    expect(onDarkModeToggle).toHaveBeenCalledTimes(1);
  });

  test('keyboard-selected class applied to selected item', () => {
    render(<TestHarness projects={testProjects} />);

    fireEvent.keyDown(document, { key: 'j' });

    const firstProject = screen.getByTestId('project-1');
    expect(firstProject.className).toContain('keyboard-selected');

    const secondProject = screen.getByTestId('project-2');
    expect(secondProject.className).not.toContain('keyboard-selected');
  });
});
