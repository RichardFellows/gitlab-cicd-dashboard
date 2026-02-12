export interface Theme {
  id: string;
  name: string;
  emoji: string;
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    inactive: string;
    background: string;
    cardBg: string;
    text: string;
    textMuted: string;
    border: string;
    shadow: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    emoji: '☀️',
    isDark: false,
    colors: {
      primary: '#6e49cb',
      secondary: '#fca326',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      inactive: '#6c757d',
      background: '#f8f9fa',
      cardBg: '#fff',
      text: '#333',
      textMuted: '#666',
      border: '#e0e0e0',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    emoji: '🌙',
    isDark: true,
    colors: {
      primary: '#9d7fe8',
      secondary: '#fca326',
      success: '#4caf50',
      warning: '#ffca28',
      danger: '#f44336',
      inactive: '#9e9e9e',
      background: '#1a1a2e',
      cardBg: '#16213e',
      text: '#e0e0e0',
      textMuted: '#aaa',
      border: '#2d3a5a',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    emoji: '🧛',
    isDark: true,
    colors: {
      primary: '#bd93f9',
      secondary: '#ffb86c',
      success: '#50fa7b',
      warning: '#f1fa8c',
      danger: '#ff5555',
      inactive: '#6272a4',
      background: '#282a36',
      cardBg: '#44475a',
      text: '#f8f8f2',
      textMuted: '#6272a4',
      border: '#44475a',
      shadow: 'rgba(0, 0, 0, 0.4)',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    emoji: '❄️',
    isDark: true,
    colors: {
      primary: '#88c0d0',
      secondary: '#ebcb8b',
      success: '#a3be8c',
      warning: '#ebcb8b',
      danger: '#bf616a',
      inactive: '#4c566a',
      background: '#2e3440',
      cardBg: '#3b4252',
      text: '#eceff4',
      textMuted: '#d8dee9',
      border: '#434c5e',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    emoji: '🐱',
    isDark: true,
    colors: {
      primary: '#cba6f7',
      secondary: '#fab387',
      success: '#a6e3a1',
      warning: '#f9e2af',
      danger: '#f38ba8',
      inactive: '#6c7086',
      background: '#1e1e2e',
      cardBg: '#313244',
      text: '#cdd6f4',
      textMuted: '#a6adc8',
      border: '#45475a',
      shadow: 'rgba(0, 0, 0, 0.35)',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized',
    emoji: '🌅',
    isDark: false,
    colors: {
      primary: '#268bd2',
      secondary: '#cb4b16',
      success: '#859900',
      warning: '#b58900',
      danger: '#dc322f',
      inactive: '#93a1a1',
      background: '#fdf6e3',
      cardBg: '#eee8d5',
      text: '#657b83',
      textMuted: '#93a1a1',
      border: '#eee8d5',
      shadow: 'rgba(0, 0, 0, 0.08)',
    },
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    emoji: '🦊',
    isDark: false,
    colors: {
      primary: '#e24329',
      secondary: '#fca326',
      success: '#108548',
      warning: '#e9be74',
      danger: '#dd2b0e',
      inactive: '#89888d',
      background: '#fafafa',
      cardBg: '#ffffff',
      text: '#303030',
      textMuted: '#737278',
      border: '#dcdcde',
      shadow: 'rgba(0, 0, 0, 0.08)',
    },
  },
];

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) || themes[0];
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);

  const c = theme.colors;
  root.style.setProperty('--primary-color', c.primary);
  root.style.setProperty('--secondary-color', c.secondary);
  root.style.setProperty('--success-color', c.success);
  root.style.setProperty('--warning-color', c.warning);
  root.style.setProperty('--danger-color', c.danger);
  root.style.setProperty('--inactive-color', c.inactive);
  root.style.setProperty('--background-color', c.background);
  root.style.setProperty('--card-bg-color', c.cardBg);
  root.style.setProperty('--text-color', c.text);
  root.style.setProperty('--text-muted', c.textMuted);
  root.style.setProperty('--border-color', c.border);
  root.style.setProperty('--shadow-color', c.shadow);

  // Keep dark-mode class for backward compat with any CSS that uses it
  document.body.classList.toggle('dark-mode', theme.isDark);
}
