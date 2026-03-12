import type { Category } from './categories'
import { SLOTS, SLOT_INDEX } from './slots'
import type { SlotData } from '../store/calendarStore'

interface SummaryRow {
  date: string
  start: string
  end: string
  duration: string
  category: string
  note: string
}

function formatDuration(slots: number): string {
  const hours = Math.floor(slots / 2)
  const mins = (slots % 2) * 30
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function endTime(slotKey: string): string {
  const idx = SLOT_INDEX[slotKey]
  if (idx === 47) return '24:00'
  return SLOTS[idx + 1].key
}

export function buildSummary(
  dates: string[],
  slotData: Record<string, SlotData>,
  getCategoryLabel: (catId: string) => string
): string {
  const rows: SummaryRow[] = []

  for (const date of dates) {
    const daySlots = slotData[date]
    if (!daySlots) continue

    const filledKeys = SLOTS.filter((s) => daySlots[s.key]).map((s) => s.key)
    if (filledKeys.length === 0) continue

    let i = 0
    while (i < filledKeys.length) {
      const startKey = filledKeys[i]
      const catId = daySlots[startKey].categoryId
      let j = i + 1
      while (j < filledKeys.length) {
        const nextKey = filledKeys[j]
        if (daySlots[nextKey].categoryId !== catId) break
        if (SLOT_INDEX[nextKey] !== SLOT_INDEX[filledKeys[j - 1]] + 1) break
        j++
      }
      const lastKey = filledKeys[j - 1]
      const slotCount = j - i
      const notes = filledKeys
        .slice(i, j)
        .map((k) => daySlots[k].note)
        .filter(Boolean)
        .join('; ')

      rows.push({
        date,
        start: startKey,
        end: endTime(lastKey),
        duration: formatDuration(slotCount),
        category: getCategoryLabel(catId),
        note: notes,
      })
      i = j
    }
  }

  const header = 'Date\tStart\tEnd\tDuration\tCategory\tNote'
  const body = rows.map((r) => `${r.date}\t${r.start}\t${r.end}\t${r.duration}\t${r.category}\t${r.note}`)
  return [header, ...body].join('\n')
}
