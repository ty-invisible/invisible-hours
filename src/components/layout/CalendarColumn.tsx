import { useCallback } from 'react'
import { useCalendarStore } from '../../store/calendarStore'
import { CalendarGrid } from '../calendar/CalendarGrid'
import { WeekGrid } from '../calendar/WeekGrid'
import type { SlotEntry } from '../../store/calendarStore'

interface CalendarColumnProps {
  sync: {
    saveEntries: (dk: string, changes: Record<string, SlotEntry | null>) => Promise<void>
    saveNote: (dk: string, slotKey: string, note: string) => Promise<void>
  }
}

export function CalendarColumn({ sync }: CalendarColumnProps) {
  const viewMode = useCalendarStore((s) => s.viewMode)

  const onStrokeComplete = useCallback((dk: string, changes: Record<string, SlotEntry | null>) => {
    sync.saveEntries(dk, changes)
  }, [sync])

  const onSaveNote = useCallback((dk: string, slotKey: string, note: string) => {
    sync.saveNote(dk, slotKey, note)
  }, [sync])

  return (
    <div className="h-full bg-surface border-x border-border">
      {viewMode === 'day' ? (
        <CalendarGrid onStrokeComplete={onStrokeComplete} onSaveNote={onSaveNote} />
      ) : (
        <WeekGrid onStrokeComplete={onStrokeComplete} onSaveNote={onSaveNote} />
      )}
    </div>
  )
}
