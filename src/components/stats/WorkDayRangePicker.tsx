import { useState, useRef, useCallback, useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'

function formatSlotTime(index: number, asEnd = false): string {
  if (asEnd && index === 95) return '12 AM'
  const hour = Math.floor(index / 4)
  const min = (index % 4) * 15
  const period = hour >= 12 ? 'PM' : 'AM'
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const m = min === 0 ? '' : `:${min.toString().padStart(2, '0')}`
  return `${h}${m} ${period}`
}

interface WorkDayRangePickerProps {
  onSave?: () => Promise<void>
  inverted?: boolean
}

export function WorkDayRangePicker({ onSave, inverted }: WorkDayRangePickerProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const workDayStartIndex = useUIStore((s) => s.workDayStartIndex)
  const workDayEndIndex = useUIStore((s) => s.workDayEndIndex)
  const setWorkDayRange = useUIStore((s) => s.setWorkDayRange)

  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

  const slotFromClientX = useCallback((clientX: number): number => {
    const bar = barRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    return Math.round(pct * 96)
  }, [])

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (dragging === null) return
      const raw = slotFromClientX(e.clientX)
      const slot = Math.min(95, raw)
      if (dragging === 'start') {
        const newStart = Math.min(slot, workDayEndIndex)
        setWorkDayRange(newStart, workDayEndIndex)
      } else {
        const newEnd = Math.max(slot, workDayStartIndex)
        setWorkDayRange(workDayStartIndex, newEnd)
      }
    },
    [dragging, slotFromClientX, workDayStartIndex, workDayEndIndex, setWorkDayRange]
  )

  const handlePointerUp = useCallback(() => {
    if (dragging !== null) {
      setDragging(null)
      onSave?.()
    }
  }, [dragging, onSave])

  useEffect(() => {
    if (dragging === null) return
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragging, handlePointerMove, handlePointerUp])

  const minIdx = Math.min(workDayStartIndex, workDayEndIndex)
  const maxIdx = Math.max(workDayStartIndex, workDayEndIndex)
  const startPct = (minIdx / 96) * 100
  const endPct = maxIdx === 95 ? 100 : (maxIdx / 96) * 100

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Range</span>
        <span className="font-medium text-text">
          {formatSlotTime(workDayStartIndex)} – {formatSlotTime(workDayEndIndex, true)}
        </span>
      </div>
      <div className="pl-2">
        <div
          ref={barRef}
          className="relative h-8 w-full rounded-lg bg-bg border border-border overflow-visible select-none touch-none"
          role="slider"
          aria-label="Work day time range"
        >
        {inverted ? (
          <>
            {startPct > 0 && (
              <div
                className="absolute top-0 bottom-0 rounded-md bg-accent/30 transition-none"
                style={{ left: 0, width: `${startPct}%` }}
              />
            )}
            {endPct < 100 && (
              <div
                className="absolute top-0 bottom-0 rounded-md bg-accent/30 transition-none"
                style={{ left: `${endPct}%`, width: `${100 - endPct}%` }}
              />
            )}
          </>
        ) : (
          <div
            className="absolute top-0 bottom-0 rounded-md bg-accent/30 transition-none"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          />
        )}
        {/* Start handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent border-2 border-surface shadow cursor-ew-resize z-10 hover:scale-110 transition-transform"
          style={{ left: `calc(${startPct}% - 8px)` }}
          onPointerDown={(e) => {
            e.preventDefault()
            setDragging('start')
          }}
        />
        {/* End handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent border-2 border-surface shadow cursor-ew-resize z-10 hover:scale-110 transition-transform"
          style={{ left: `calc(${endPct}% - 8px)` }}
          onPointerDown={(e) => {
            e.preventDefault()
            setDragging('end')
          }}
        />
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted px-0.5">
        <span>12am</span>
        <span>12pm</span>
        <span>12am</span>
      </div>
    </div>
  )
}
