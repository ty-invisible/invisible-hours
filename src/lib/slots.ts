export type SlotGranularity = 15 | 30 | 60

export const SLOT_MINUTES = 15

export interface Slot {
  key: string
  label: string
  index: number
}

export const SLOTS: Slot[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, '0')
  const m = ((i % 4) * 15).toString().padStart(2, '0')
  const key = `${h}:${m}`
  return { key, label: key, index: i }
})

export const SLOT_INDEX: Record<string, number> = Object.fromEntries(
  SLOTS.map((s) => [s.key, s.index])
)

export const WORKDAY_START_DEFAULT = 36 // 09:00
export const WORKDAY_END_DEFAULT = 71   // 17:45 (inclusive, last 15-min slot of 17:00–17:59)

export interface DisplaySlot {
  key: string
  label: string
  displayIndex: number
  baseIndices: number[]
  baseKeys: string[]
}

export function getDisplaySlots(granularity: SlotGranularity): DisplaySlot[] {
  const step = granularity / SLOT_MINUTES
  const count = 96 / step
  return Array.from({ length: count }, (_, di) => {
    const startBase = di * step
    const baseIndices = Array.from({ length: step }, (_, j) => startBase + j)
    const baseKeys = baseIndices.map((i) => SLOTS[i].key)
    return {
      key: SLOTS[startBase].key,
      label: SLOTS[startBase].label,
      displayIndex: di,
      baseIndices,
      baseKeys,
    }
  })
}

export interface DisplaySegment {
  baseKey: string
  categoryId: string | null
}

export function getDisplaySegments(
  daySlots: Record<string, { categoryId: string }>,
  baseKeys: string[],
): DisplaySegment[] {
  return baseKeys.map((k) => ({
    baseKey: k,
    categoryId: daySlots[k]?.categoryId ?? null,
  }))
}

/** Returns the set of slot keys between startIndex and endIndex (inclusive, base 15-min indices). */
export function getWorkDayKeys(startIndex: number, endIndex: number): Set<string> {
  const lo = Math.max(0, Math.min(startIndex, endIndex))
  const hi = Math.min(95, Math.max(startIndex, endIndex))
  return new Set(SLOTS.slice(lo, hi + 1).map((s) => s.key))
}

export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function parseDate(dk: string): Date {
  const [y, m, d] = dk.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getWeekDates(d: Date): Date[] {
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date
  })
}

/** Returns all dates visible in a month grid (Mon-start weeks, including padding from adjacent months). */
export function getMonthDates(d: Date): Date[] {
  const year = d.getFullYear(), month = d.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - startPad)
  const endPad = (7 - ((last.getDay() + 6) % 7) - 1) % 7
  const end = new Date(last)
  end.setDate(last.getDate() + endPad)
  const dates: Date[] = []
  for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    dates.push(new Date(cur))
  }
  return dates
}
