import { SLOTS } from './slots'
import type { SlotEntry } from '../store/calendarStore'
import type { SlotGroupPosition } from '../components/calendar/SlotCell'

export function computeSlotGroupPositions(
  daySlots: Record<string, SlotEntry>
): Record<string, SlotGroupPosition> {
  const positions: Record<string, SlotGroupPosition> = {}

  for (let i = 0; i < SLOTS.length; i++) {
    const entry = daySlots[SLOTS[i].key]
    if (!entry) continue

    const prev = i > 0 ? daySlots[SLOTS[i - 1].key] : undefined
    const next = i < SLOTS.length - 1 ? daySlots[SLOTS[i + 1].key] : undefined
    const sameAbove = prev?.categoryId === entry.categoryId
    const sameBelow = next?.categoryId === entry.categoryId

    if (!sameAbove && !sameBelow) positions[SLOTS[i].key] = 'solo'
    else if (!sameAbove) positions[SLOTS[i].key] = 'first'
    else if (!sameBelow) positions[SLOTS[i].key] = 'last'
    else positions[SLOTS[i].key] = 'middle'
  }

  return positions
}
