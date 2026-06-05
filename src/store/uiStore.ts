import { create } from 'zustand'
import { WORKDAY_START_DEFAULT, WORKDAY_END_DEFAULT, type SlotGranularity } from '../lib/slots'

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
  slotGranularity: SlotGranularity

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
  setSlotGranularity: (g: SlotGranularity) => void
}

const PALETTE_KEY = 'idt-palette-w'
const STATS_KEY = 'idt-stats-w'
const WORKDAY_KEY = 'invisible_hours_work_day'
const THEME_KEY = 'idt-theme'
const WEEKENDS_KEY = 'idt-show-weekends'
const GRANULARITY_KEY = 'idt-slot-granularity'
const WORKDAY_MIGRATED_KEY = 'idt-workday-migrated-96'

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
      let s = Math.max(0, Number(start))
      let e = Math.max(0, Number(end))
      if (!Number.isNaN(s) && !Number.isNaN(e)) {
        const migrated = localStorage.getItem(WORKDAY_MIGRATED_KEY)
        if (!migrated && s <= 47 && e <= 47) {
          s = s * 2
          e = e * 2 + 1
          localStorage.setItem(WORKDAY_KEY, JSON.stringify([s, e]))
          localStorage.setItem(WORKDAY_MIGRATED_KEY, '1')
        }
        return { start: Math.min(95, s), end: Math.min(95, e) }
      }
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
  return 'dark'
}

function loadShowWeekends(): boolean {
  try {
    const v = localStorage.getItem(WEEKENDS_KEY)
    if (v === 'false') return false
  } catch { /* noop */ }
  return true
}

function loadSlotGranularity(): SlotGranularity {
  try {
    const v = localStorage.getItem(GRANULARITY_KEY)
    if (v === '15' || v === '30' || v === '60') return Number(v) as SlotGranularity
  } catch { /* noop */ }
  return 30
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
  slotGranularity: loadSlotGranularity(),

  setPaletteWidth: (w) => {
    localStorage.setItem(PALETTE_KEY, String(w))
    set({ paletteWidth: w })
  },

  setStatsWidth: (w) => {
    localStorage.setItem(STATS_KEY, String(w))
    set({ statsWidth: w })
  },

  setWorkDayRange: (startIndex, endIndex) => {
    const s = Math.max(0, Math.min(95, startIndex))
    const e = Math.max(0, Math.min(95, endIndex))
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

  setSlotGranularity: (g) => {
    localStorage.setItem(GRANULARITY_KEY, String(g))
    set({ slotGranularity: g })
  },

  addToast: (toast) =>
    set((state) => ({
      toastQueue: [...state.toastQueue, { ...toast, id: crypto.randomUUID() }],
    })),

  removeToast: (id) =>
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
    })),
}))
