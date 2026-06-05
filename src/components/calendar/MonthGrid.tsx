import { useMemo } from 'react'
import { useCalendarStore } from '../../store/calendarStore'
import { useCategoryStore } from '../../store/categoryStore'
import { dateKey, getMonthDates, SLOT_MINUTES } from '../../lib/slots'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_BARS = 4

interface DaySummary {
  dk: string
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  totalMinutes: number
  bars: { catId: string; color: string; fraction: number }[]
}

export function MonthGrid() {
  const currentDate = useCalendarStore((s) => s.currentDate)
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate)
  const setViewMode = useCalendarStore((s) => s.setViewMode)
  const slotData = useCalendarStore((s) => s.slotData)
  const getCategoryColor = useCategoryStore((s) => s.getCategoryColor)

  const todayDk = dateKey(new Date())
  const currentMonth = currentDate.getMonth()

  const gridDates = useMemo(() => getMonthDates(currentDate), [currentDate])

  const days: DaySummary[] = useMemo(() => {
    return gridDates.map((date) => {
      const dk = dateKey(date)
      const daySlots = slotData[dk] || {}
      const counts = new Map<string, number>()
      for (const entry of Object.values(daySlots)) {
        counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1)
      }
      const totalSlots = Array.from(counts.values()).reduce((a, b) => a + b, 0)
      const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_BARS)
      const bars = sorted.map(([catId, count]) => ({
        catId,
        color: getCategoryColor(catId),
        fraction: totalSlots > 0 ? count / totalSlots : 0,
      }))
      return {
        dk,
        date,
        isCurrentMonth: date.getMonth() === currentMonth,
        isToday: dk === todayDk,
        totalMinutes: totalSlots * SLOT_MINUTES,
        bars,
      }
    })
  }, [gridDates, slotData, currentMonth, todayDk, getCategoryColor])

  const weeks: DaySummary[][] = useMemo(() => {
    const result: DaySummary[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  const handleDayClick = (date: Date) => {
    setCurrentDate(date)
    setViewMode('day')
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex-1 grid auto-rows-fr gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day) => (
              <button
                key={day.dk}
                type="button"
                onClick={() => handleDayClick(day.date)}
                className={`
                  relative flex flex-col rounded-lg border text-left p-1.5 transition-colors
                  hover:bg-accent/5 hover:border-accent/30 cursor-pointer
                  ${day.isToday
                    ? 'border-accent bg-accent/5'
                    : 'border-border'
                  }
                  ${!day.isCurrentMonth ? 'opacity-40' : ''}
                `}
              >
                <span
                  className={`text-xs font-medium leading-none mb-1 ${
                    day.isToday ? 'text-accent' : 'text-text'
                  }`}
                >
                  {day.date.getDate()}
                </span>

                {day.bars.length > 0 && (
                  <div className="flex-1 flex flex-col justify-end gap-0.5 min-h-0">
                    {day.bars.map((bar) => (
                      <div
                        key={bar.catId}
                        className="h-1.5 rounded-full min-w-[4px]"
                        style={{
                          backgroundColor: bar.color,
                          width: `${Math.max(15, bar.fraction * 100)}%`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {day.totalMinutes > 0 && (
                  <span className="text-[10px] text-muted leading-none mt-auto pt-0.5">
                    {day.totalMinutes >= 60
                      ? `${Math.floor(day.totalMinutes / 60)}h${day.totalMinutes % 60 ? ` ${day.totalMinutes % 60}m` : ''}`
                      : `${day.totalMinutes}m`}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
