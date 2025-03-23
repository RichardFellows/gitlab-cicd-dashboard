import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Runs a cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock Chart.js to avoid canvas errors
vi.mock('chart.js', () => {
  const registerables = ['CategoryScale', 'LinearScale', 'BarElement', 'Title', 'Tooltip', 'Legend'];
  
  return {
    Chart: {
      register: vi.fn(),
      defaults: {},
    },
    registerables,
    Tooltip: vi.fn(),
    BarElement: vi.fn(),
    ArcElement: vi.fn(),
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    Title: vi.fn(),
    Legend: vi.fn(),
    LineElement: vi.fn(),
    PointElement: vi.fn(),
    TimeScale: vi.fn(),
    TimeSeriesScale: vi.fn(),
    DoughnutController: vi.fn(),
    PieController: vi.fn()
  };
});

// Mock Canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  save: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  restore: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
}));