import { getDisplaySlots, type SlotGranularity } from './slots'
import type { SlotEntry } from '../store/calendarStore'
import type { SlotGroupPosition } from '../components/calendar/SlotCell'

/**
 * Returns the single category id if all filled base keys share it,
 * or undefined if empty or mixed.
 */
function getUniformCategoryId(
  daySlots: Record<string, SlotEntry>,
  baseKeys: string[],
): string | undefined {
  let catId: string | undefined
  for (const k of baseKeys) {
    if (!daySlots[k]) continue
    if (!catId) {
      catId = daySlots[k].categoryId
    } else if (daySlots[k].categoryId !== catId) {
      return undefined
    }
  }
  return catId
}

export function computeSlotGroupPositions(
  daySlots: Record<string, SlotEntry>,
  granularity: SlotGranularity = 30,
): Record<string, SlotGroupPosition> {
  const displaySlots = getDisplaySlots(granularity)
  const positions: Record<string, SlotGroupPosition> = {}

  for (let i = 0; i < displaySlots.length; i++) {
    const catId = getUniformCategoryId(daySlots, displaySlots[i].baseKeys)
    if (!catId) {
      const hasFill = displaySlots[i].baseKeys.some((k) => !!daySlots[k])
      if (hasFill) positions[displaySlots[i].key] = 'solo'
      continue
    }

    const prevCatId = i > 0
      ? getUniformCategoryId(daySlots, displaySlots[i - 1].baseKeys)
      : undefined
    const nextCatId = i < displaySlots.length - 1
      ? getUniformCategoryId(daySlots, displaySlots[i + 1].baseKeys)
      : undefined

    const sameAbove = prevCatId === catId
    const sameBelow = nextCatId === catId

    if (!sameAbove && !sameBelow) positions[displaySlots[i].key] = 'solo'
    else if (!sameAbove) positions[displaySlots[i].key] = 'first'
    else if (!sameBelow) positions[displaySlots[i].key] = 'last'
    else positions[displaySlots[i].key] = 'middle'
  }

  return positions
}
