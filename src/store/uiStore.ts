import { create } from 'zustand'
import { WORKDAY_START_DEFAULT, WORKDAY_END_DEFAULT } from '../lib/slots'

export type SaveStatus = 'idle' | 'saving' | 'saved'
export type Theme = 'light' | 'dark' | 'system'
export type MobileTab = 'palette' | 'calendar' | 'stats'

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
  workDayStartIndex: number
  workDayEndIndex: number
  theme: Theme
  showWeekends: boolean
  focusMode: boolean
  mobileTab: MobileTab

  setPaletteWidth: (w: number) => void
  setStatsWidth: (w: number) => void
  setSaveStatus: (s: SaveStatus) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setWorkDayRange: (startIndex: number, endIndex: number) => void
  setTheme: (t: Theme) => void
  setShowWeekends: (show: boolean) => void
  toggleFocusMode: () => void
  setMobileTab: (tab: MobileTab) => void
}

const PALETTE_KEY = 'idt-palette-w'
const STATS_KEY = 'idt-stats-w'
const WORKDAY_KEY = 'invisible_hours_work_day'
const THEME_KEY = 'idt-theme'
const WEEKENDS_KEY = 'idt-show-weekends'

function loadWidth(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key)
    if (v) return Math.max(0, parseInt(v, 10))
  } catch { /* noop */ }
  return fallback
}

function loadWorkDayRange(): { start: number; end: number } {
  try {
    const v = localStorage.getItem(WORKDAY_KEY)
    if (v) {
      const [start, end] = JSON.parse(v)
      const s = Math.max(0, Math.min(47, Number(start)))
      const e = Math.max(0, Math.min(47, Number(end)))
      if (!Number.isNaN(s) && !Number.isNaN(e)) return { start: s, end: e }
    }
  } catch { /* noop */ }
  return { start: WORKDAY_START_DEFAULT, end: WORKDAY_END_DEFAULT }
}

const { start: loadedStart, end: loadedEnd } = loadWorkDayRange()

function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* noop */ }
  return 'system'
}

function loadShowWeekends(): boolean {
  try {
    const v = localStorage.getItem(WEEKENDS_KEY)
    if (v === 'false') return false
  } catch { /* noop */ }
  return true
}

export const useUIStore = create<UIState>((set) => ({
  paletteWidth: loadWidth(PALETTE_KEY, 220),
  statsWidth: loadWidth(STATS_KEY, 280),
  saveStatus: 'idle',
  toastQueue: [],
  workDayStartIndex: loadedStart,
  workDayEndIndex: loadedEnd,
  theme: loadTheme(),
  showWeekends: loadShowWeekends(),
  focusMode: false,
  mobileTab: 'calendar',

  setPaletteWidth: (w) => {
    localStorage.setItem(PALETTE_KEY, String(w))
    set({ paletteWidth: w })
  },

  setStatsWidth: (w) => {
    localStorage.setItem(STATS_KEY, String(w))
    set({ statsWidth: w })
  },

  setWorkDayRange: (startIndex, endIndex) => {
    const s = Math.max(0, Math.min(47, startIndex))
    const e = Math.max(0, Math.min(47, endIndex))
    localStorage.setItem(WORKDAY_KEY, JSON.stringify([s, e]))
    set({ workDayStartIndex: s, workDayEndIndex: e })
  },

  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t)
    set({ theme: t })
  },

  setShowWeekends: (show) => {
    localStorage.setItem(WEEKENDS_KEY, String(show))
    set({ showWeekends: show })
  },

  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),

  setMobileTab: (tab) => set({ mobileTab: tab }),

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
