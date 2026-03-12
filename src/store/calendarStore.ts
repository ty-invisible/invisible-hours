import { create } from 'zustand'
import { dateKey } from '../lib/slots'

export interface SlotEntry {
  categoryId: string
  note: string
}

export type SlotData = Record<string, SlotEntry>

export interface UndoEntry {
  dateKey: string
  slots: SlotData
}

interface CalendarState {
  currentDate: Date
  viewMode: 'day' | 'week'
  slotData: Record<string, SlotData>
  undoStack: UndoEntry[]
  focusedSlot: { dateKey: string; slotKey: string } | null

  setCurrentDate: (d: Date) => void
  setViewMode: (mode: 'day' | 'week') => void
  setSlotData: (dk: string, data: SlotData) => void
  mergeSlotData: (allData: Record<string, SlotData>) => void

  setSlot: (dk: string, slotKey: string, entry: SlotEntry | null) => void
  setSlotsBatch: (dk: string, updates: Record<string, SlotEntry | null>) => void
  setNote: (dk: string, slotKey: string, note: string) => void

  pushUndo: (entry: UndoEntry) => void
  undo: () => UndoEntry | null

  setFocusedSlot: (slot: { dateKey: string; slotKey: string } | null) => void
  clearFocusedSlot: () => void
}

const MAX_UNDO = 50

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentDate: new Date(),
  viewMode: 'day',
  slotData: {},
  undoStack: [],
  focusedSlot: null,

  setCurrentDate: (d) => set({ currentDate: d }),
  setViewMode: (mode) => set({ viewMode: mode }),

  setSlotData: (dk, data) =>
    set((state) => ({
      slotData: { ...state.slotData, [dk]: data },
    })),

  mergeSlotData: (allData) =>
    set((state) => ({
      slotData: { ...state.slotData, ...allData },
    })),

  setSlot: (dk, slotKey, entry) =>
    set((state) => {
      const daySlots = { ...(state.slotData[dk] || {}) }
      if (entry === null) {
        delete daySlots[slotKey]
      } else {
        daySlots[slotKey] = entry
      }
      return { slotData: { ...state.slotData, [dk]: daySlots } }
    }),

  setSlotsBatch: (dk, updates) =>
    set((state) => {
      const daySlots = { ...(state.slotData[dk] || {}) }
      for (const [key, entry] of Object.entries(updates)) {
        if (entry === null) {
          delete daySlots[key]
        } else {
          daySlots[key] = entry
        }
      }
      return { slotData: { ...state.slotData, [dk]: daySlots } }
    }),

  setNote: (dk, slotKey, note) =>
    set((state) => {
      const daySlots = { ...(state.slotData[dk] || {}) }
      if (daySlots[slotKey]) {
        daySlots[slotKey] = { ...daySlots[slotKey], note }
      }
      return { slotData: { ...state.slotData, [dk]: daySlots } }
    }),

  pushUndo: (entry) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-(MAX_UNDO - 1)), entry],
    })),

  undo: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return null
    const entry = undoStack[undoStack.length - 1]
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      slotData: { ...state.slotData, [entry.dateKey]: entry.slots },
    }))
    return entry
  },

  setFocusedSlot: (slot) => set({ focusedSlot: slot }),
  clearFocusedSlot: () => set({ focusedSlot: null }),
}))

export const selectDayKey = () => dateKey(useCalendarStore.getState().currentDate)
