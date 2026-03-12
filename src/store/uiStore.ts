import { create } from 'zustand'

export type SaveStatus = 'idle' | 'saving' | 'saved'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface UIState {
  paletteWidth: number
  statsWidth: number
  saveStatus: SaveStatus
  toastQueue: Toast[]

  setPaletteWidth: (w: number) => void
  setStatsWidth: (w: number) => void
  setSaveStatus: (s: SaveStatus) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const PALETTE_KEY = 'idt-palette-w'
const STATS_KEY = 'idt-stats-w'

function loadWidth(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key)
    if (v) return Math.max(0, parseInt(v, 10))
  } catch { /* noop */ }
  return fallback
}

export const useUIStore = create<UIState>((set) => ({
  paletteWidth: loadWidth(PALETTE_KEY, 220),
  statsWidth: loadWidth(STATS_KEY, 280),
  saveStatus: 'idle',
  toastQueue: [],

  setPaletteWidth: (w) => {
    localStorage.setItem(PALETTE_KEY, String(w))
    set({ paletteWidth: w })
  },

  setStatsWidth: (w) => {
    localStorage.setItem(STATS_KEY, String(w))
    set({ statsWidth: w })
  },

  setSaveStatus: (s) => set({ saveStatus: s }),

  addToast: (toast) =>
    set((state) => ({
      toastQueue: [...state.toastQueue, { ...toast, id: crypto.randomUUID() }],
    })),

  removeToast: (id) =>
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
    })),
}))
