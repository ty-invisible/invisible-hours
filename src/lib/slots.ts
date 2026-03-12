export interface Slot {
  key: string
  label: string
  index: number
}

export const SLOTS: Slot[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  const key = `${h}:${m}`
  return { key, label: key, index: i }
})

export const SLOT_INDEX: Record<string, number> = Object.fromEntries(
  SLOTS.map((s) => [s.key, s.index])
)

export const WORKDAY_START = 18 // 09:00
export const WORKDAY_END = 35   // 17:00 (inclusive)
export const WORKDAY_KEYS = new Set(SLOTS.slice(WORKDAY_START, WORKDAY_END + 1).map((s) => s.key))

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
