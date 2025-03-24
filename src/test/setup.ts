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

// Mock Canvas - use type assertion to satisfy TypeScript
const mockContext = {
  clearRect: vi.fn(),
  save: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  restore: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  // Add required properties for CanvasRenderingContext2D
  canvas: document.createElement('canvas'),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  filter: 'none',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low',
  fillStyle: '#000',
  strokeStyle: '#000',
  shadowBlur: 0,
  shadowColor: '#000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  lineWidth: 1,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  miterLimit: 10,
  lineDashOffset: 0,
  font: '10px sans-serif',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  direction: 'ltr' as CanvasDirection,
  drawImage: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({
    width: 0,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 0,
    fontBoundingBoxAscent: 0,
    fontBoundingBoxDescent: 0,
    emHeightAscent: 0,
    emHeightDescent: 0,
    hangingBaseline: 0,
    alphabeticBaseline: 0,
    ideographicBaseline: 0,
  })),
  // More required stub methods
  createPattern: vi.fn(),
  createRadialGradient: vi.fn(),
  getLineDash: vi.fn(() => []),
  setLineDash: vi.fn(),
  getTransform: vi.fn(),
  resetTransform: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  transform: vi.fn(),
  translate: vi.fn(),
  clip: vi.fn(),
  isPointInPath: vi.fn(),
  isPointInStroke: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  stroke: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  rect: vi.fn(),
  ellipse: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(0),
    width: 0,
    height: 0,
    colorSpace: 'srgb',
  })),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
};

// @ts-ignore - Ignore type checking for this mock
HTMLCanvasElement.prototype.getContext = function(contextId) {
  if (contextId === '2d') {
    return mockContext as unknown as CanvasRenderingContext2D;
  }
  return null;
};