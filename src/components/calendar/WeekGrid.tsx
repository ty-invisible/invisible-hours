import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SLOTS, dateKey, getWeekDates } from '../../lib/slots'
import { useCalendarStore } from '../../store/calendarStore'
import { useUIStore } from '../../store/uiStore'
import { SlotCell } from './SlotCell'
import { NotePopup } from './NotePopup'
import { useDragPaint } from '../../hooks/useDragPaint'
import type { SlotEntry } from '../../store/calendarStore'
import { computeSlotGroupPositions } from '../../lib/slotGroups'

const WEEK_SLOT_HEIGHT = 44
const SCROLL_TO_INDEX = 16 // 08:00
const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatHourLabel(slotKey: string): string {
  const hour = parseInt(slotKey.split(':')[0], 10)
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

interface WeekGridProps {
  onStrokeComplete: (dk: string, changes: Record<string, SlotEntry | null>) => void
  onSaveNote: (dk: string, slotKey: string, note: string) => void
}

export function WeekGrid({ onStrokeComplete, onSaveNote }: WeekGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentDate = useCalendarStore((s) => s.currentDate)
  const slotData = useCalendarStore((s) => s.slotData)
  const setFocusedSlot = useCalendarStore((s) => s.setFocusedSlot)

  const showWeekends = useUIStore((s) => s.showWeekends)

  const allWeekDates = getWeekDates(currentDate)
  const visibleDays = useMemo(() => {
    const days = allWeekDates.map((d, i) => ({ date: d, abbrev: DAY_ABBREVS[i] }))
    return showWeekends ? days : days.slice(0, 5)
  }, [allWeekDates, showWeekends])
  const todayDk = dateKey(new Date())

  const { onSlotMouseDown, onSlotMouseEnter, onMouseUp, onSlotTouchStart, handleNativeTouchMove, handleNativeTouchEnd, isDragging } = useDragPaint(onStrokeComplete)

  const [notePopup, setNotePopup] = useState<{
    dk: string; slotKey: string; position: { x: number; y: number }
  } | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = SCROLL_TO_INDEX * WEEK_SLOT_HEIGHT
    })
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseUp])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('touchmove', handleNativeTouchMove, { passive: false })
    el.addEventListener('touchend', handleNativeTouchEnd)
    return () => {
      el.removeEventListener('touchmove', handleNativeTouchMove)
      el.removeEventListener('touchend', handleNativeTouchEnd)
    }
  }, [handleNativeTouchMove, handleNativeTouchEnd])

  const handleContextMenu = useCallback((_e: React.MouseEvent, dk: string, slotKey: string) => {
    setFocusedSlot({ dateKey: dk, slotKey })
  }, [setFocusedSlot])

  const handleNoteClick = useCallback((e: React.MouseEvent, dk: string, slotKey: string) => {
    setNotePopup({ dk, slotKey, position: { x: e.clientX, y: e.clientY } })
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Day headers — offset left to account for hour label gutter */}
      <div className="flex border-b border-border flex-shrink-0">
        <div className="w-12 flex-shrink-0" />
        {visibleDays.map(({ date, abbrev }, i) => {
          const dk = dateKey(date)
          const isToday = dk === todayDk
          return (
            <motion.div
              key={dk}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex-1 text-center py-2 text-xs font-medium ${
                isToday ? 'text-accent bg-accent/5' : 'text-muted'
              }`}
            >
              {abbrev} {date.getDate()}
            </motion.div>
          )
        })}
      </div>

      {/* Slot grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onMouseLeave={onMouseUp}
      >
        <div className="flex pt-3">
          {/* Hour labels gutter */}
          <div className="w-12 flex-shrink-0 relative" style={{ height: SLOTS.length * WEEK_SLOT_HEIGHT }}>
            {SLOTS.map((slot) => {
              if (!slot.key.endsWith(':00')) return null
              return (
                <div
                  key={slot.key}
                  className="absolute right-1.5 text-[10px] text-muted select-none leading-none"
                  style={{ top: Math.max(0, slot.index * WEEK_SLOT_HEIGHT - 5) }}
                >
                  {formatHourLabel(slot.key)}
                </div>
              )
            })}
          </div>

          {/* Day columns */}
          <div className="flex-1 flex">
            {visibleDays.map(({ date }) => {
              const dk = dateKey(date)
              const daySlots = slotData[dk] || {}
              const groupPositions = computeSlotGroupPositions(daySlots)
              return (
                <div key={dk} className={`flex-1 ${dk === todayDk ? 'bg-accent/[0.03]' : ''}`}>
                  {SLOTS.map((slot) => (
                    <SlotCell
                      key={slot.key}
                      dk={dk}
                      slotKey={slot.key}
                      slotLabel={slot.label}
                      entry={daySlots[slot.key]}
                      isWeekView
                      isDragging={isDragging}
                      groupPosition={groupPositions[slot.key]}
                      onMouseDown={onSlotMouseDown}
                      onMouseEnter={onSlotMouseEnter}
                      onTouchStart={onSlotTouchStart}
                      onContextMenu={handleContextMenu}
                      onNoteClick={handleNoteClick}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {notePopup && (
          <NotePopup
            key={`${notePopup.dk}-${notePopup.slotKey}`}
            dk={notePopup.dk}
            slotKey={notePopup.slotKey}
            position={notePopup.position}
            onClose={() => setNotePopup(null)}
            onSaveNote={onSaveNote}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
