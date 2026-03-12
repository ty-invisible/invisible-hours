import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence } from 'motion/react'
import { SLOTS, dateKey } from '../../lib/slots'
import { useCalendarStore } from '../../store/calendarStore'
import { SlotCell } from './SlotCell'
import { NowLine } from './NowLine'
import { NotePopup } from './NotePopup'
import { useDragPaint } from '../../hooks/useDragPaint'
import type { SlotEntry } from '../../store/calendarStore'

const SLOT_HEIGHT = 48
const SCROLL_TO_INDEX = 16 // 08:00

function formatHourLabel(slotKey: string): string {
  const hour = parseInt(slotKey.split(':')[0], 10)
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

interface CalendarGridProps {
  onStrokeComplete: (dk: string, changes: Record<string, SlotEntry | null>) => void
  onSaveNote: (dk: string, slotKey: string, note: string) => void
}

export function CalendarGrid({ onStrokeComplete, onSaveNote }: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentDate = useCalendarStore((s) => s.currentDate)
  const slotData = useCalendarStore((s) => s.slotData)
  const setFocusedSlot = useCalendarStore((s) => s.setFocusedSlot)

  const dk = dateKey(currentDate)
  const daySlots = slotData[dk] || {}

  const isToday = dk === dateKey(new Date())

  const { onSlotMouseDown, onSlotMouseEnter, onMouseUp } = useDragPaint(onStrokeComplete)

  const [notePopup, setNotePopup] = useState<{
    dk: string; slotKey: string; position: { x: number; y: number }
  } | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = SCROLL_TO_INDEX * SLOT_HEIGHT
    })
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseUp])

  const handleContextMenu = useCallback((_e: React.MouseEvent, dk: string, slotKey: string) => {
    setFocusedSlot({ dateKey: dk, slotKey })
  }, [setFocusedSlot])

  const handleNoteClick = useCallback((e: React.MouseEvent, dk: string, slotKey: string) => {
    setNotePopup({ dk, slotKey, position: { x: e.clientX, y: e.clientY } })
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative"
        onMouseLeave={onMouseUp}
      >
        <div className="relative flex pt-3">
          {/* Hour labels gutter */}
          <div className="w-14 flex-shrink-0 relative" style={{ height: SLOTS.length * SLOT_HEIGHT }}>
            {SLOTS.map((slot) => {
              const isHour = slot.key.endsWith(':00')
              if (!isHour) return null
              return (
                <div
                  key={slot.key}
                  className="absolute right-2 text-[11px] text-muted select-none leading-none"
                  style={{ top: Math.max(0, slot.index * SLOT_HEIGHT - 6) }}
                >
                  {formatHourLabel(slot.key)}
                </div>
              )
            })}
          </div>

          {/* Slots column */}
          <div className="flex-1 relative">
            {isToday && <NowLine />}
            {SLOTS.map((slot) => (
              <SlotCell
                key={slot.key}
                dk={dk}
                slotKey={slot.key}
                slotLabel={slot.label}
                entry={daySlots[slot.key]}
                onMouseDown={onSlotMouseDown}
                onMouseEnter={onSlotMouseEnter}
                onContextMenu={handleContextMenu}
                onNoteClick={handleNoteClick}
              />
            ))}
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
