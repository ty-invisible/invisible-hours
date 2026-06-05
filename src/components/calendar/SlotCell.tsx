import { memo, useRef, useCallback, useMemo } from 'react'
import { contrastColor, lighten } from '../../lib/categories'
import { useCategoryStore } from '../../store/categoryStore'
import { useCalendarStore } from '../../store/calendarStore'
import type { GoogleCalendarSlotInfo } from '../../store/googleCalendarStore'
import type { DisplaySegment } from '../../lib/slots'

const CROSS_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cline x1='4' y1='4' x2='16' y2='16' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='16' y1='4' x2='4' y2='16' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='4' y1='4' x2='16' y2='16' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3Cline x1='16' y1='4' x2='4' y2='16' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 10 10, crosshair`

const PLUS_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cline x1='10' y1='4' x2='10' y2='16' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='4' y1='10' x2='16' y2='10' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='10' y1='4' x2='10' y2='16' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3Cline x1='4' y1='10' x2='16' y2='10' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 10 10, cell`

const SWAP_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cline x1='4' y1='7' x2='16' y2='7' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cpolyline points='12,4 16,7 12,10' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='16' y1='13' x2='4' y2='13' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cpolyline points='8,10 4,13 8,16' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='4' y1='7' x2='16' y2='7' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3Cpolyline points='12,4 16,7 12,10' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='16' y1='13' x2='4' y2='13' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3Cpolyline points='8,10 4,13 8,16' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 10 10, pointer`

export type SlotGroupPosition = 'solo' | 'first' | 'middle' | 'last'

interface SlotCellProps {
  dk: string
  slotKey: string
  slotLabel: string
  segments: DisplaySegment[]
  googleEvent?: GoogleCalendarSlotInfo | null
  isWeekView?: boolean
  isDragging?: boolean
  groupPosition?: SlotGroupPosition
  slotHeight?: number
  onMouseDown: (dk: string, slotKey: string, e: React.MouseEvent) => void
  onMouseEnter: (dk: string, slotKey: string) => void
  onTouchStart?: (dk: string, slotKey: string, x: number, y: number, touchId: number) => void
  onTouchEnd?: (dk: string, slotKey: string) => void
  onTouchCancel?: () => void
  onContextMenu: (e: React.MouseEvent, dk: string, slotKey: string) => void
  onNoteClick: (e: React.MouseEvent, dk: string, slotKey: string) => void
}

const GROUP_RADIUS: Record<SlotGroupPosition, string> = {
  solo: 'rounded-lg',
  first: 'rounded-t-lg',
  middle: '',
  last: 'rounded-b-lg',
}

function buildSegmentGradient(
  segments: DisplaySegment[],
  getCategoryColor: (catId: string) => string,
): string | undefined {
  const n = segments.length
  if (n <= 1) return undefined

  const colors = segments.map((s) =>
    s.categoryId ? getCategoryColor(s.categoryId) : 'var(--color-surface)'
  )

  const bands: { color: string; start: number; end: number }[] = []
  let i = 0
  while (i < n) {
    let j = i + 1
    while (j < n && colors[j] === colors[i]) j++
    bands.push({
      color: colors[i],
      start: (i / n) * 100,
      end: (j / n) * 100,
    })
    i = j
  }

  if (bands.length === 1) return undefined

  const stops = bands.map((band, bi) => {
    const pos = bi === 0 ? 0 : bi === bands.length - 1 ? 100 : ((band.start + band.end) / 2)
    return `${band.color} ${pos}%`
  })

  return `linear-gradient(to bottom, ${stops.join(', ')})`
}

export const SlotCell = memo(function SlotCell({
  dk, slotKey, segments, googleEvent, isWeekView, isDragging, groupPosition, slotHeight,
  onMouseDown, onMouseEnter, onTouchStart, onTouchEnd, onTouchCancel, onContextMenu, onNoteClick,
}: SlotCellProps) {
  const activeCategoryId = useCategoryStore((s) => s.activeCategoryId)
  const eraserOn = useCategoryStore((s) => s.eraserOn)
  const getCategoryColor = useCategoryStore((s) => s.getCategoryColor)
  const getCategoryLabel = useCategoryStore((s) => s.getCategoryLabel)

  const firstFilled = segments.find((s) => s.categoryId !== null)
  const isFilled = !!firstFilled
  const primaryCatId = firstFilled?.categoryId ?? null

  const slotData = useCalendarStore((s) => s.slotData)
  const hasNote = isFilled && !!slotData[dk]?.[firstFilled.baseKey]?.note

  const isMultiSegment = segments.length > 1
  const filledCount = segments.filter((s) => s.categoryId !== null).length
  const isPartialFill = isMultiSegment && filledCount > 0 && filledCount < segments.length
  const hasMultipleCategories = useMemo(() => {
    const cats = new Set(segments.filter((s) => s.categoryId).map((s) => s.categoryId))
    return cats.size > 1
  }, [segments])
  const needsGradient = isMultiSegment && isFilled && (hasMultipleCategories || isPartialFill)

  const color = primaryCatId ? getCategoryColor(primaryCatId) : undefined
  const textColor = color ? contrastColor(color) : undefined

  const combinedLabel = useMemo(() => {
    if (!isFilled) return undefined
    const seen = new Set<string>()
    const labels: string[] = []
    for (const seg of segments) {
      if (seg.categoryId && !seen.has(seg.categoryId)) {
        seen.add(seg.categoryId)
        labels.push(getCategoryLabel(seg.categoryId))
      }
    }
    return labels.join(' & ')
  }, [segments, isFilled, getCategoryLabel])

  const gradientBg = useMemo(
    () => needsGradient ? buildSegmentGradient(segments, getCategoryColor) : undefined,
    [needsGradient, segments, getCategoryColor],
  )

  const showPreview = !isFilled && activeCategoryId && !eraserOn
  const previewColor = showPreview ? getCategoryColor(activeCategoryId) : undefined

  const isHourStart = slotKey.endsWith(':00')

  const showCross = !isDragging && (eraserOn || (isFilled && activeCategoryId === primaryCatId))
  const showSwap = !isDragging && isFilled && !eraserOn && !!activeCategoryId && activeCategoryId !== primaryCatId
  const showPlus = !isDragging && !isFilled && !!activeCategoryId && !eraserOn

  const showIdleHover = !isDragging && isFilled && !activeCategoryId && !eraserOn
  const roundedClass = groupPosition ? GROUP_RADIUS[groupPosition] : ''

  const idleGradient = useMemo(() => {
    if (!showIdleHover || !color) return undefined
    const l1 = lighten(color, 0.18)
    const l2 = lighten(color, 0.3)
    return `linear-gradient(-45deg, ${color}, ${l1}, ${l2}, ${l1}, ${color})`
  }, [showIdleHover, color])

  const swapColor = showSwap && activeCategoryId ? getCategoryColor(activeCategoryId) : undefined
  const swapOverlayRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!swapOverlayRef.current || !showSwap) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    swapOverlayRef.current.style.background =
      `radial-gradient(circle at ${x}px ${y}px, ${swapColor}90 0%, transparent 50%)`
  }, [showSwap, swapColor])

  const cursor = showCross ? CROSS_CURSOR : showSwap ? SWAP_CURSOR : showPlus ? PLUS_CURSOR : undefined

  const fillStyle = useMemo(() => {
    if (!isFilled) return undefined
    if (gradientBg) {
      return { background: gradientBg, color: textColor }
    }
    return { backgroundColor: color, color: textColor }
  }, [isFilled, gradientBg, color, textColor])

  return (
    <div
      data-dk={dk}
      data-slot-key={slotKey}
      className={`group relative flex items-center select-none ${isHourStart ? 'border-t border-border/40' : 'border-t border-border/15'}
      `}
      style={{ height: slotHeight ?? (isWeekView ? 44 : 48), ...(cursor ? { cursor } : {}) }}
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
      onTouchStart={(e) => {
        if (!activeCategoryId && !eraserOn) return
        const t = e.touches[0]
        onTouchStart?.(dk, slotKey, t.clientX, t.clientY, t.identifier)
      }}
      onTouchEnd={() => {
        if (!activeCategoryId && !eraserOn) return
        onTouchEnd?.(dk, slotKey)
      }}
      onTouchCancel={() => {
        if (!activeCategoryId && !eraserOn) return
        onTouchCancel?.()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        if (isFilled) onContextMenu(e, dk, slotKey)
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Slot content */}
      <div className={`flex-1 h-full relative overflow-hidden ${roundedClass}`}>
        {isFilled ? (
          <div
            className={`absolute inset-0 flex items-center px-2 transition-[filter,opacity] duration-150 ${roundedClass} ${
              showCross ? 'group-hover:opacity-60 group-hover:saturate-50' : ''
            }`}
            style={fillStyle}
          >
            {(!groupPosition || groupPosition === 'solo' || groupPosition === 'first') && (
              <span className={`${isWeekView ? 'text-[10px]' : 'text-xs'} font-medium truncate relative z-10`}>
                {combinedLabel}
              </span>
            )}
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
                className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
              />
            )}
            {showIdleHover && idleGradient && !gradientBg && (
              <div
                className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  background: idleGradient,
                  backgroundSize: '300% 300%',
                  animation: 'gradient-flow 6s ease infinite',
                }}
              />
            )}
          </div>
        ) : showPreview ? (
          <>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-[0.31] transition-opacity rounded-lg"
              style={{ backgroundColor: previewColor }}
            />
            {googleEvent && (
              <div className={`absolute inset-0 flex items-center px-2 pointer-events-none bg-muted/15 ${googleEvent.isFirstSlot && googleEvent.isLastSlot ? 'rounded-lg' : googleEvent.isFirstSlot ? 'rounded-t-lg' : googleEvent.isLastSlot ? 'rounded-b-lg' : ''}`}>
                {googleEvent.isFirstSlot && (
                  <span className={`${isWeekView ? 'text-[9px]' : 'text-[11px]'} text-muted/80 truncate`}>
                    {googleEvent.summary}
                  </span>
                )}
              </div>
            )}
          </>
        ) : googleEvent ? (
          <div className={`absolute inset-0 flex items-center px-2 pointer-events-none bg-muted/15 ${googleEvent.isFirstSlot && googleEvent.isLastSlot ? 'rounded-lg' : googleEvent.isFirstSlot ? 'rounded-t-lg' : googleEvent.isLastSlot ? 'rounded-b-lg' : ''}`}>
            {googleEvent.isFirstSlot && (
              <span className={`${isWeekView ? 'text-[9px]' : 'text-[11px]'} text-muted/80 truncate`}>
                {googleEvent.summary}
              </span>
            )}
          </div>
        ) : (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity bg-current rounded-lg"
          />
        )}
      </div>
    </div>
  )
})
