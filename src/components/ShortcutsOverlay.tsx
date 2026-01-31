import { FC } from 'react';

interface ShortcutsOverlayProps {
  onClose: () => void;
  darkMode?: boolean;
}

/** Placeholder — fully implemented in a subsequent task */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ShortcutsOverlay: FC<ShortcutsOverlayProps> = ({ onClose, darkMode }) => {
  return (
    <div className="shortcuts-overlay-backdrop" onClick={onClose}>
      <div className="shortcuts-overlay" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts" onClick={e => e.stopPropagation()}>
        <p>Shortcuts overlay — coming soon</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ShortcutsOverlay;
