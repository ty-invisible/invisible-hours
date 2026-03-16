import { memo, useRef, useCallback, useMemo } from 'react'
import { contrastColor, lighten } from '../../lib/categories'
import { useCategoryStore } from '../../store/categoryStore'
import { useCalendarStore, type SlotEntry } from '../../store/calendarStore'

const CROSS_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cline x1='4' y1='4' x2='16' y2='16' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='16' y1='4' x2='4' y2='16' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='4' y1='4' x2='16' y2='16' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3Cline x1='16' y1='4' x2='4' y2='16' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 10 10, crosshair`

const PLUS_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cline x1='10' y1='4' x2='10' y2='16' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='4' y1='10' x2='16' y2='10' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='10' y1='4' x2='10' y2='16' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3Cline x1='4' y1='10' x2='16' y2='10' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 10 10, cell`

const SWAP_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cline x1='4' y1='7' x2='16' y2='7' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cpolyline points='12,4 16,7 12,10' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='16' y1='13' x2='4' y2='13' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cpolyline points='8,10 4,13 8,16' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='4' y1='7' x2='16' y2='7' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3Cpolyline points='12,4 16,7 12,10' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='16' y1='13' x2='4' y2='13' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3Cpolyline points='8,10 4,13 8,16' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 10 10, pointer`

interface SlotCellProps {
  dk: string
  slotKey: string
  slotLabel: string
  entry: SlotEntry | undefined
  isWeekView?: boolean
  isDragging?: boolean
  onMouseDown: (dk: string, slotKey: string, e: React.MouseEvent) => void
  onMouseEnter: (dk: string, slotKey: string) => void
  onContextMenu: (e: React.MouseEvent, dk: string, slotKey: string) => void
  onNoteClick: (e: React.MouseEvent, dk: string, slotKey: string) => void
}

export const SlotCell = memo(function SlotCell({
  dk, slotKey, entry, isWeekView, isDragging,
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

  const showCross = !isDragging && (eraserOn || (isFilled && activeCategoryId === entry.categoryId))
  const showSwap = !isDragging && isFilled && !eraserOn && !!activeCategoryId && activeCategoryId !== entry.categoryId
  const showPlus = !isDragging && !isFilled && !!activeCategoryId && !eraserOn

  const showIdleHover = !isDragging && isFilled && !activeCategoryId && !eraserOn

  const idleGradient = useMemo(() => {
    if (!showIdleHover || !color) return undefined
    const l1 = lighten(color, 0.18)
    const l2 = lighten(color, 0.3)
    return `linear-gradient(-45deg, ${color}, ${l1}, ${l2}, ${l1}, ${color})`
  }, [showIdleHover, color])

  const swapColor = showSwap ? getCategoryColor(activeCategoryId) : undefined
  const swapOverlayRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!swapOverlayRef.current || !showSwap) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    swapOverlayRef.current.style.background =
      `radial-gradient(circle at ${x}px ${y}px, ${swapColor}90 0%, transparent 50%)`
  }, [showSwap, swapColor, color])

  const cursor = showCross ? CROSS_CURSOR : showSwap ? SWAP_CURSOR : showPlus ? PLUS_CURSOR : undefined

  return (
    <div
      className={`group relative flex items-center select-none ${
        isWeekView ? 'h-[44px]' : 'h-[48px]'
      } ${isHourStart ? 'border-t border-border/40' : 'border-t border-border/15'}
      ${isFocused ? 'ring-2 ring-accent ring-inset z-10' : ''}`}
      style={cursor ? { cursor } : undefined}
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
      onMouseMove={showSwap ? handleMouseMove : undefined}
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
            className={`absolute inset-0 flex items-center px-2 transition-[filter,opacity] duration-150 ${
              showCross ? 'group-hover:opacity-60 group-hover:saturate-50' : ''
            }`}
            style={{ backgroundColor: color, color: textColor }}
          >
            <span className={`${isWeekView ? 'text-[10px]' : 'text-xs'} font-medium truncate relative z-10`}>
              {label}
            </span>
            {hasNote && (
              <button
                onClick={(e) => { e.stopPropagation(); onNoteClick(e, dk, slotKey) }}
                className="absolute top-0.5 right-1 w-2 h-2 rounded-full opacity-70 hover:opacity-100 z-10"
                style={{ backgroundColor: textColor }}
              />
            )}
            {showSwap && (
              <div
                ref={swapOverlayRef}
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
              />
            )}
            {showIdleHover && idleGradient && (
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  background: idleGradient,
                  backgroundSize: '300% 300%',
                  animation: 'gradient-flow 6s ease infinite',
                }}
              />
            )}
          </div>
        ) : showPreview ? (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-[0.31] transition-opacity"
            style={{ backgroundColor: previewColor }}
          />
        ) : (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity bg-current"
          />
        )}
      </div>
    </div>
  )
})
