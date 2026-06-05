import { SLOTS, SLOT_MINUTES } from './slots'
import type { GoogleCalendarEvent, GoogleCalendarSlotInfo } from '../store/googleCalendarStore'

/**
 * Maps a list of Google Calendar events for a single day into a
 * Record<slotKey, GoogleCalendarSlotInfo> so each 15-min base slot knows
 * which event (if any) occupies it.
 *
 * - allDay events are skipped (they don't map to specific time slots).
 * - For timed events, the first overlapping slot gets isFirstSlot: true
 *   (so the UI can show the event name there), and subsequent slots get
 *   isFirstSlot: false (continuation bar, no text).
 * - If multiple events overlap a slot, the first one wins.
 */
export function mapEventsToSlots(
  events: GoogleCalendarEvent[],
  dateKey: string,
): Record<string, GoogleCalendarSlotInfo> {
  const result: Record<string, GoogleCalendarSlotInfo> = {}

  for (const event of events) {
    if (event.allDay) continue

    const startDate = new Date(event.start)
    const endDate = new Date(event.end)

    const dayStart = new Date(`${dateKey}T00:00:00`)
    const dayEnd = new Date(`${dateKey}T23:59:59`)

    const effectiveStart = startDate < dayStart ? dayStart : startDate
    const effectiveEnd = endDate > dayEnd ? dayEnd : endDate

    const startMinutes = effectiveStart.getHours() * 60 + effectiveStart.getMinutes()
    const endMinutes = effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes()

    const startSlotIndex = Math.floor(startMinutes / SLOT_MINUTES)
    const endSlotIndex = endMinutes % SLOT_MINUTES === 0
      ? Math.max(startSlotIndex, (endMinutes / SLOT_MINUTES) - 1)
      : Math.floor(endMinutes / SLOT_MINUTES)

    const lastIndex = Math.min(endSlotIndex, SLOTS.length - 1)
    let isFirst = true
    for (let i = startSlotIndex; i <= lastIndex; i++) {
      const slotKey = SLOTS[i].key
      if (result[slotKey]) continue

      result[slotKey] = {
        summary: event.summary,
        eventId: event.id,
        isFirstSlot: isFirst,
        isLastSlot: i === lastIndex,
      }
      isFirst = false
    }
  }

  return result
}
