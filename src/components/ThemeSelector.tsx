import { useState, useRef, useEffect } from 'react';
import { themes, Theme } from '../themes';

interface ThemeSelectorProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="icon-btn theme-btn"
        onClick={() => setOpen(!open)}
        title={`Theme: ${currentTheme.name}`}
        aria-label="Change theme"
      >
        {currentTheme.emoji}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            background: 'var(--card-bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            boxShadow: '0 4px 12px var(--shadow-color)',
            zIndex: 1000,
            minWidth: 160,
            overflow: 'hidden',
          }}
        >
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onThemeChange(theme);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: theme.id === currentTheme.id ? 'var(--border-color)' : 'transparent',
                color: 'var(--text-color)',
                cursor: 'pointer',
                fontSize: 14,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (theme.id !== currentTheme.id) {
                  (e.target as HTMLElement).style.background = 'var(--border-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (theme.id !== currentTheme.id) {
                  (e.target as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span>{theme.emoji}</span>
              <span>{theme.name}</span>
              {theme.id === currentTheme.id && <span style={{ marginLeft: 'auto' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
