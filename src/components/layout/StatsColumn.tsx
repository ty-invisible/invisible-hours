import { useMemo, useState, useCallback } from 'react'
import { useCalendarStore } from '../../store/calendarStore'
import { useCategoryStore } from '../../store/categoryStore'
import { useUIStore } from '../../store/uiStore'
import { dateKey, getWeekDates, getWorkDayKeys } from '../../lib/slots'
import { StatsTabs, type StatsMode } from '../stats/StatsTabs'
import { DonutChart } from '../stats/DonutChart'
import { BreakdownList } from '../stats/BreakdownList'
import { WorkDayRangePicker } from '../stats/WorkDayRangePicker'

interface StatsColumnProps {
  sync?: { saveWorkDayRange?: () => Promise<void> }
}

export function StatsColumn({ sync }: StatsColumnProps) {
  const [mode, setMode] = useState<StatsMode>('total')
  const [hiddenCatIds, setHiddenCatIds] = useState<Set<string>>(new Set())
  const currentDate = useCalendarStore((s) => s.currentDate)
  const viewMode = useCalendarStore((s) => s.viewMode)
  const slotData = useCalendarStore((s) => s.slotData)
  const categories = useCategoryStore((s) => s.categories)
  const getCategoryColor = useCategoryStore((s) => s.getCategoryColor)
  const getCategoryLabel = useCategoryStore((s) => s.getCategoryLabel)
  const workDayStartIndex = useUIStore((s) => s.workDayStartIndex)
  const workDayEndIndex = useUIStore((s) => s.workDayEndIndex)

  const workDayKeys = useMemo(
    () => getWorkDayKeys(workDayStartIndex, workDayEndIndex),
    [workDayStartIndex, workDayEndIndex]
  )

  const toggleVisibility = useCallback((catId: string) => {
    setHiddenCatIds((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  const stats = useMemo(() => {
    const dates = viewMode === 'day'
      ? [dateKey(currentDate)]
      : getWeekDates(currentDate).map(dateKey)

    const counts = new Map<string, number>()

    for (const dk of dates) {
      const daySlots = slotData[dk]
      if (!daySlots) continue
      for (const [slotKey, entry] of Object.entries(daySlots)) {
        if (mode === '9-5' && !workDayKeys.has(slotKey)) continue
        if (mode === 'overtime' && workDayKeys.has(slotKey)) continue
        counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1)
      }
    }

    const allSegments = Array.from(counts.entries())
      .map(([catId, count]) => ({
        catId,
        color: getCategoryColor(catId),
        value: count,
      }))
      .sort((a, b) => b.value - a.value)

    const breakdown = allSegments.map((seg) => ({
      catId: seg.catId,
      label: getCategoryLabel(seg.catId),
      color: seg.color,
      minutes: seg.value * 30,
    }))

    const visibleSegments = allSegments.filter((s) => !hiddenCatIds.has(s.catId))
    const visibleSlots = visibleSegments.reduce((a, s) => a + s.value, 0)
    const visibleMinutes = visibleSlots * 30

    const segments = visibleSegments.map((s) => ({
      ...s,
      fraction: visibleSlots > 0 ? s.value / visibleSlots : 0,
    }))

    return { segments, totalMinutes: visibleMinutes, breakdown }
  }, [currentDate, viewMode, slotData, mode, workDayKeys, hiddenCatIds, categories, getCategoryColor, getCategoryLabel])

  return (
    <div className="h-full flex flex-col bg-surface p-3 gap-4">
      <StatsTabs active={mode} onChange={setMode} />

      {mode === '9-5' && (
        <WorkDayRangePicker onSave={sync?.saveWorkDayRange} />
      )}

      <div className="flex justify-center">
        <DonutChart segments={stats.segments} totalMinutes={stats.totalMinutes} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <BreakdownList
          items={stats.breakdown}
          hiddenCatIds={hiddenCatIds}
          onToggleVisibility={toggleVisibility}
        />
      </div>
    </div>
  )
}
