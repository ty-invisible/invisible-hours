import { create } from 'zustand'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
}

export interface GoogleCalendarSlotInfo {
  summary: string
  eventId: string
  isFirstSlot: boolean
  isLastSlot: boolean
}

interface GoogleCalendarState {
  linked: boolean
  loading: boolean
  visible: boolean
  eventsByDate: Record<string, GoogleCalendarEvent[]>

  setLinked: (linked: boolean) => void
  setLoading: (loading: boolean) => void
  setVisible: (visible: boolean) => void
  toggleVisible: () => void
  setEventsForDates: (data: Record<string, GoogleCalendarEvent[]>) => void
  clearEvents: () => void
}

export const useGoogleCalendarStore = create<GoogleCalendarState>((set) => ({
  linked: false,
  loading: false,
  visible: true,
  eventsByDate: {},

  setLinked: (linked) => set({ linked }),
  setLoading: (loading) => set({ loading }),
  setVisible: (visible) => set({ visible }),
  toggleVisible: () => set((s) => ({ visible: !s.visible })),

  setEventsForDates: (data) =>
    set((state) => ({
      eventsByDate: { ...state.eventsByDate, ...data },
    })),

  clearEvents: () => set({ eventsByDate: {}, linked: false }),
}))
