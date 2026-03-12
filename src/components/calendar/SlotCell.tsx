import { memo } from 'react'
import { contrastColor } from '../../lib/categories'
import { useCategoryStore } from '../../store/categoryStore'
import { useCalendarStore, type SlotEntry } from '../../store/calendarStore'

interface SlotCellProps {
  dk: string
  slotKey: string
  slotLabel: string
  entry: SlotEntry | undefined
  isWeekView?: boolean
  onMouseDown: (dk: string, slotKey: string, e: React.MouseEvent) => void
  onMouseEnter: (dk: string, slotKey: string) => void
  onContextMenu: (e: React.MouseEvent, dk: string, slotKey: string) => void
  onNoteClick: (e: React.MouseEvent, dk: string, slotKey: string) => void
}

export const SlotCell = memo(function SlotCell({
  dk, slotKey, entry, isWeekView,
  onMouseDown, onMouseEnter, onContextMenu, onNoteClick,
}: SlotCellProps) {
  const activeCategoryId = useCategoryStore((s) => s.activeCategoryId)
  const eraserOn = useCategoryStore((s) => s.eraserOn)
  const getCategoryColor = useCategoryStore((s) => s.getCategoryColor)
  const getCategoryLabel = useCategoryStore((s) => s.getCategoryLabel)
  const focusedSlot = useCalendarStore((s) => s.focusedSlot)

  const isFocused = focusedSlot?.dateKey === dk && focusedSlot?.slotKey === slotKey
  const isFilled = !!entry
  const hasNote = isFilled && !!entry.note

  const color = isFilled ? getCategoryColor(entry.categoryId) : undefined
  const textColor = color ? contrastColor(color) : undefined
  const label = isFilled ? getCategoryLabel(entry.categoryId) : undefined

  const showPreview = !isFilled && activeCategoryId && !eraserOn
  const previewColor = showPreview ? getCategoryColor(activeCategoryId) : undefined

  const isHourStart = slotKey.endsWith(':00')

  return (
    <div
      className={`group relative flex items-center select-none ${
        isWeekView ? 'h-[44px]' : 'h-[48px]'
      } ${isHourStart ? 'border-t border-border/40' : 'border-t border-border/15'}
      ${isFocused ? 'ring-2 ring-accent ring-inset z-10' : ''}`}
      onMouseDown={(e) => {
        if (e.button === 2) return
        if (!activeCategoryId && !eraserOn) {
          if (isFilled) {
            onContextMenu(e, dk, slotKey)
          }
          return
        }
        onMouseDown(dk, slotKey, e)
      }}
      onMouseEnter={() => onMouseEnter(dk, slotKey)}
      onContextMenu={(e) => {
        e.preventDefault()
        if (isFilled) onContextMenu(e, dk, slotKey)
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Slot content */}
      <div className="flex-1 h-full relative overflow-hidden">
        {isFilled ? (
          <div
            className="absolute inset-0 flex items-center px-2"
            style={{ backgroundColor: color, color: textColor }}
          >
            <span className={`${isWeekView ? 'text-[10px]' : 'text-xs'} font-medium truncate`}>
              {label}
            </span>
            {hasNote && (
              <button
                onClick={(e) => { e.stopPropagation(); onNoteClick(e, dk, slotKey) }}
                className="absolute top-0.5 right-1 w-2 h-2 rounded-full opacity-70 hover:opacity-100"
                style={{ backgroundColor: textColor }}
              />
            )}
          </div>
        ) : showPreview ? (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-[0.31] transition-opacity"
            style={{ backgroundColor: previewColor }}
          />
        ) : null}
      </div>
    </div>
  )
})
