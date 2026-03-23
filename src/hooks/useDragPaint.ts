import { useRef, useCallback, useState } from 'react'
import { useCalendarStore, type SlotData, type SlotEntry } from '../store/calendarStore'
import { useCategoryStore } from '../store/categoryStore'
import { SLOT_INDEX, SLOTS } from '../lib/slots'

type TouchPhase = 'idle' | 'pending' | 'scrolling'

const MOVE_THRESHOLD = 10

interface DragPaintResult {
  onSlotMouseDown: (dk: string, slotKey: string, e: React.MouseEvent) => void
  onSlotMouseEnter: (dk: string, slotKey: string) => void
  onMouseUp: () => void
  onSlotTouchStart: (dk: string, slotKey: string, touchX: number, touchY: number) => void
  handleNativeTouchMove: (e: TouchEvent) => void
  handleNativeTouchEnd: () => void
  isDragging: boolean
}

function slotKeyFromIndex(i: number): string {
  return SLOTS[i].key
}

export function useDragPaint(onStrokeComplete?: (dk: string, changes: Record<string, SlotEntry | null>) => void): DragPaintResult {
  const isDragging = useRef(false)
  const [isDraggingState, setIsDraggingState] = useState(false)
  const dragDateKey = useRef<string>('')
  const dragLastKey = useRef<string>('')
  const dragMode = useRef<'paint' | 'erase'>('paint')
  const dragCategoryId = useRef<string | null>(null)
  const preStrokeSnapshot = useRef<SlotData>({})
  const dragStroke = useRef<Set<string>>(new Set())
  const strokeChanges = useRef<Record<string, SlotEntry | null>>({})

  const touchPhase = useRef<TouchPhase>('idle')
  const touchStartSlot = useRef<{ dk: string; slotKey: string } | null>(null)
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const paintSlot = useCallback((dk: string, slotKey: string) => {
    const { setSlot } = useCalendarStore.getState()

    if (dragMode.current === 'erase') {
      const hadContent = !!preStrokeSnapshot.current[slotKey]
      if (hadContent) {
        setSlot(dk, slotKey, null)
        strokeChanges.current[slotKey] = null
      }
    } else if (dragCategoryId.current) {
      const entry: SlotEntry = { categoryId: dragCategoryId.current, note: '' }
      setSlot(dk, slotKey, entry)
      strokeChanges.current[slotKey] = entry
    }
    dragStroke.current.add(slotKey)
  }, [])

  const restoreSlot = useCallback((dk: string, slotKey: string) => {
    if (!dragStroke.current.has(slotKey)) return
    const { setSlot } = useCalendarStore.getState()
    const original = preStrokeSnapshot.current[slotKey] ?? null
    setSlot(dk, slotKey, original)
    dragStroke.current.delete(slotKey)
    delete strokeChanges.current[slotKey]
  }, [])

  const fillGap = useCallback((dk: string, fromKey: string, toKey: string) => {
    const fromIdx = SLOT_INDEX[fromKey]
    const toIdx = SLOT_INDEX[toKey]
    const step = toIdx > fromIdx ? 1 : -1

    for (let i = fromIdx + step; step > 0 ? i <= toIdx : i >= toIdx; i += step) {
      const key = slotKeyFromIndex(i)
      if (!dragStroke.current.has(key)) {
        paintSlot(dk, key)
      }
    }
  }, [paintSlot])

  const enterSlot = useCallback((dk: string, slotKey: string) => {
    if (!isDragging.current) return
    if (dk !== dragDateKey.current) return
    if (slotKey === dragLastKey.current) return

    const currentIdx = SLOT_INDEX[slotKey]
    const lastIdx = SLOT_INDEX[dragLastKey.current]

    if (dragStroke.current.has(slotKey)) {
      const minIdx = Math.min(currentIdx, lastIdx)
      const maxIdx = Math.max(currentIdx, lastIdx)

      for (let i = minIdx; i <= maxIdx; i++) {
        restoreSlot(dk, slotKeyFromIndex(i))
      }
    } else {
      fillGap(dk, dragLastKey.current, slotKey)
    }

    dragLastKey.current = slotKey
  }, [restoreSlot, fillGap])

  const beginStroke = useCallback((dk: string, slotKey: string) => {
    const { activeCategoryId, eraserOn } = useCategoryStore.getState()
    const { slotData, pushUndo } = useCalendarStore.getState()

    if (!activeCategoryId && !eraserOn) return

    const daySlots = slotData[dk] || {}
    const existing = daySlots[slotKey]

    isDragging.current = true
    setIsDraggingState(true)
    dragDateKey.current = dk
    dragLastKey.current = slotKey
    preStrokeSnapshot.current = { ...daySlots }
    dragStroke.current = new Set()
    strokeChanges.current = {}

    pushUndo({ dateKey: dk, slots: { ...daySlots } })

    if (eraserOn) {
      dragMode.current = 'erase'
      dragCategoryId.current = null
      paintSlot(dk, slotKey)
    } else if (activeCategoryId) {
      if (existing && existing.categoryId === activeCategoryId) {
        dragMode.current = 'erase'
        dragCategoryId.current = null
        paintSlot(dk, slotKey)
      } else {
        dragMode.current = 'paint'
        dragCategoryId.current = activeCategoryId
        paintSlot(dk, slotKey)
      }
    }
  }, [paintSlot])

  const endStroke = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    setIsDraggingState(false)

    const dk = dragDateKey.current
    const changes = { ...strokeChanges.current }
    strokeChanges.current = {}
    dragStroke.current.clear()

    if (Object.keys(changes).length > 0 && onStrokeComplete) {
      onStrokeComplete(dk, changes)
    }
  }, [onStrokeComplete])

  // --- Mouse handlers ---

  const onSlotMouseDown = useCallback((dk: string, slotKey: string, e: React.MouseEvent) => {
    e.preventDefault()
    beginStroke(dk, slotKey)
  }, [beginStroke])

  const onSlotMouseEnter = useCallback((dk: string, slotKey: string) => {
    enterSlot(dk, slotKey)
  }, [enterSlot])

  const onMouseUp = useCallback(() => {
    endStroke()
  }, [endStroke])

  // --- Touch handlers (tap-only on mobile, no drag painting) ---

  const onSlotTouchStart = useCallback((dk: string, slotKey: string, _touchX: number, _touchY: number) => {
    touchPhase.current = 'pending'
    touchStartSlot.current = { dk, slotKey }
    touchStartPos.current = { x: _touchX, y: _touchY }
  }, [])

  const handleNativeTouchMove = useCallback((e: TouchEvent) => {
    if (touchPhase.current !== 'pending') return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
      touchPhase.current = 'scrolling'
    }
  }, [])

  const handleNativeTouchEnd = useCallback(() => {
    const phase = touchPhase.current
    const slot = touchStartSlot.current

    touchPhase.current = 'idle'
    touchStartSlot.current = null

    if (phase === 'pending' && slot) {
      beginStroke(slot.dk, slot.slotKey)
      endStroke()
    }
  }, [beginStroke, endStroke])

  return {
    onSlotMouseDown,
    onSlotMouseEnter,
    onMouseUp,
    onSlotTouchStart,
    handleNativeTouchMove,
    handleNativeTouchEnd,
    isDragging: isDraggingState,
  }
}
