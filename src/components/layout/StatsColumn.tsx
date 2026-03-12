import { useMemo, useState } from 'react'
import { useCalendarStore } from '../../store/calendarStore'
import { useCategoryStore } from '../../store/categoryStore'
import { dateKey, getWeekDates, WORKDAY_KEYS } from '../../lib/slots'
import { StatsTabs, type StatsMode } from '../stats/StatsTabs'
import { DonutChart } from '../stats/DonutChart'
import { BreakdownList } from '../stats/BreakdownList'

export function StatsColumn() {
  const [mode, setMode] = useState<StatsMode>('total')
  const currentDate = useCalendarStore((s) => s.currentDate)
  const viewMode = useCalendarStore((s) => s.viewMode)
  const slotData = useCalendarStore((s) => s.slotData)
  const categories = useCategoryStore((s) => s.categories)
  const getCategoryColor = useCategoryStore((s) => s.getCategoryColor)
  const getCategoryLabel = useCategoryStore((s) => s.getCategoryLabel)

  const stats = useMemo(() => {
    const dates = viewMode === 'day'
      ? [dateKey(currentDate)]
      : getWeekDates(currentDate).map(dateKey)

    const counts = new Map<string, number>()

    for (const dk of dates) {
      const daySlots = slotData[dk]
      if (!daySlots) continue
      for (const [slotKey, entry] of Object.entries(daySlots)) {
        if (mode === '9-5' && !WORKDAY_KEYS.has(slotKey)) continue
        if (mode === 'overtime' && WORKDAY_KEYS.has(slotKey)) continue
        counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1)
      }
    }

    const totalSlots = Array.from(counts.values()).reduce((a, b) => a + b, 0)
    const totalMinutes = totalSlots * 30

    const segments = Array.from(counts.entries())
      .map(([catId, count]) => ({
        catId,
        color: getCategoryColor(catId),
        value: count,
        fraction: totalSlots > 0 ? count / totalSlots : 0,
      }))
      .sort((a, b) => b.value - a.value)

    const breakdown = segments.map((seg) => ({
      catId: seg.catId,
      label: getCategoryLabel(seg.catId),
      color: seg.color,
      minutes: seg.value * 30,
    }))

    return { segments, totalMinutes, breakdown }
  }, [currentDate, viewMode, slotData, mode, categories, getCategoryColor, getCategoryLabel])

  return (
    <div className="h-full flex flex-col bg-surface p-3 gap-4">
      <StatsTabs active={mode} onChange={setMode} />

      <div className="flex justify-center">
        <DonutChart segments={stats.segments} totalMinutes={stats.totalMinutes} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <BreakdownList items={stats.breakdown} />
      </div>
    </div>
  )
}
