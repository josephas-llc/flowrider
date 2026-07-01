import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage for Zustand persist middleware
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  key: vi.fn((index: number) => Object.keys(localStorageMock.store)[index] || null),
  get length() {
    return Object.keys(localStorageMock.store).length;
  },
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.electron API
vi.stubGlobal('window', {
  ...window,
  electron: {
    sessions: {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'test-session', name: 'Test Session' }),
      delete: vi.fn().mockResolvedValue(true),
    },
    terminal: {
      spawn: vi.fn().mockReturnValue('pty-123'),
      write: vi.fn(),
      kill: vi.fn(),
      resize: vi.fn(),
      onData: vi.fn(),
    },
    ai: {
      sendMessage: vi.fn().mockResolvedValue({ content: 'AI response' }),
      getProviders: vi.fn().mockResolvedValue(['claude', 'ollama']),
    },
    costTracker: {
      getSessionCosts: vi.fn().mockResolvedValue([]),
      getTotalCosts: vi.fn().mockResolvedValue({ totalTokens: 0, totalCost: 0 }),
    },
  },
});

// Mock matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
