import { FC, useEffect, useRef } from 'react';
import { SHORTCUT_DEFINITIONS, CATEGORY_LABELS, ShortcutCategory } from '../utils/shortcuts';
import '../styles/ShortcutsOverlay.css';

interface ShortcutsOverlayProps {
  onClose: () => void;
  darkMode?: boolean;
}

const CATEGORY_ORDER: ShortcutCategory[] = ['navigation', 'actions', 'projects'];

const ShortcutsOverlay: FC<ShortcutsOverlayProps> = ({ onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel for accessibility
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  // Group shortcuts by category
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    shortcuts: SHORTCUT_DEFINITIONS.filter(s => s.category === cat),
  }));

  return (
    <div className="shortcuts-overlay-backdrop" onClick={onClose} data-testid="shortcuts-overlay-backdrop">
      <div
        className="shortcuts-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
        onClick={e => e.stopPropagation()}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="shortcuts-overlay__header">
          <h2>Keyboard Shortcuts</h2>
          <button
            className="shortcuts-overlay__close"
            onClick={onClose}
            aria-label="Close shortcuts"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="shortcuts-overlay__body">
          {grouped.map(group => (
            <div key={group.category} className="shortcuts-overlay__group">
              <h3 className="shortcuts-overlay__group-title">{group.label}</h3>
              <dl className="shortcuts-overlay__list">
                {group.shortcuts.map(shortcut => (
                  <div key={shortcut.key} className="shortcuts-overlay__item">
                    <dt><kbd>{shortcut.keyDisplay}</kbd></dt>
                    <dd>{shortcut.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutsOverlay;
