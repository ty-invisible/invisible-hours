import { useRef, useCallback, useState, useEffect } from 'react'
import { useCalendarStore, type SlotData, type SlotEntry } from '../store/calendarStore'
import { useCategoryStore } from '../store/categoryStore'
import { SLOT_INDEX, SLOTS } from '../lib/slots'

/**
 * Commit tap-to-paint only if the finger stays within this radius (px) of touchstart.
 * Larger motion = scroll / drag intent, not a tap.
 */
const TAP_MAX_MOVEMENT_PX = 14

interface DragPaintResult {
  onSlotMouseDown: (dk: string, slotKey: string, e: React.MouseEvent) => void
  onSlotMouseEnter: (dk: string, slotKey: string) => void
  onMouseUp: () => void
  /** `touchId` must be `Touch.identifier` from the same touchstart event (used for global touchend matching). */
  onSlotTouchStart: (dk: string, slotKey: string, touchX: number, touchY: number, touchId: number) => void
  /** Unused: tap completion runs on window `touchend` (see onSlotTouchStart). Kept so callers can omit wiring. */
  onSlotTouchEnd: (dk: string, slotKey: string) => void
  onSlotTouchCancel: () => void
  handleNativeTouchMove: (e: TouchEvent) => void
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

  const touchStartSlot = useRef<{ dk: string; slotKey: string } | null>(null)
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const touchMaxMove = useRef(0)
  const activeTouchId = useRef<number | null>(null)
  const removeGlobalTouchListeners = useRef<(() => void) | null>(null)
  /** After a touch tap paints, iOS may emit a synthetic mouse sequence — ignore mousedown briefly. */
  const ignoreMouseDownUntil = useRef(0)

  const detachGlobalTouchListeners = useCallback(() => {
    removeGlobalTouchListeners.current?.()
    removeGlobalTouchListeners.current = null
  }, [])

  useEffect(
    () => () => {
      detachGlobalTouchListeners()
      activeTouchId.current = null
      touchStartSlot.current = null
    },
    [detachGlobalTouchListeners],
  )

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

  const beginStrokeRef = useRef(beginStroke)
  beginStrokeRef.current = beginStroke
  const endStrokeRef = useRef(endStroke)
  endStrokeRef.current = endStroke

  // --- Mouse handlers ---

  const onSlotMouseDown = useCallback((dk: string, slotKey: string, e: React.MouseEvent) => {
    if (Date.now() < ignoreMouseDownUntil.current) return
    e.preventDefault()
    beginStroke(dk, slotKey)
  }, [beginStroke])

  const onSlotMouseEnter = useCallback((dk: string, slotKey: string) => {
    enterSlot(dk, slotKey)
  }, [enterSlot])

  const onMouseUp = useCallback(() => {
    endStroke()
  }, [endStroke])

  // --- Touch: tap-only via window touchend (slot-level touchend is unreliable on iOS) ---

  const onSlotTouchStart = useCallback(
    (dk: string, slotKey: string, touchX: number, touchY: number, touchId: number) => {
      detachGlobalTouchListeners()

      touchStartSlot.current = { dk, slotKey }
      touchStartPos.current = { x: touchX, y: touchY }
      touchMaxMove.current = 0
      activeTouchId.current = touchId

      const onGlobalTouchEnd = (e: TouchEvent) => {
        if (activeTouchId.current === null) return
        let ours = false
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchId.current) {
            ours = true
            break
          }
        }
        if (!ours) return

        const slot = touchStartSlot.current
        const maxMove = touchMaxMove.current

        detachGlobalTouchListeners()
        activeTouchId.current = null
        touchStartSlot.current = null

        if (e.type === 'touchcancel') return
        if (!slot) return
        if (maxMove > TAP_MAX_MOVEMENT_PX) return

        beginStrokeRef.current(slot.dk, slot.slotKey)
        endStrokeRef.current()
        ignoreMouseDownUntil.current = Date.now() + 450
      }

      window.addEventListener('touchend', onGlobalTouchEnd, true)
      window.addEventListener('touchcancel', onGlobalTouchEnd, true)
      removeGlobalTouchListeners.current = () => {
        window.removeEventListener('touchend', onGlobalTouchEnd, true)
        window.removeEventListener('touchcancel', onGlobalTouchEnd, true)
      }
    },
    [detachGlobalTouchListeners],
  )

  const handleNativeTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartSlot.current || activeTouchId.current === null) return
    let t: Touch | undefined
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === activeTouchId.current) {
        t = e.touches[i]
        break
      }
    }
    if (!t) return
    const dx = t.clientX - touchStartPos.current.x
    const dy = t.clientY - touchStartPos.current.y
    const d = Math.hypot(dx, dy)
    if (d > touchMaxMove.current) touchMaxMove.current = d
  }, [])

  const onSlotTouchEnd = useCallback((_dk: string, _slotKey: string) => {}, [])

  const onSlotTouchCancel = useCallback(() => {
    detachGlobalTouchListeners()
    activeTouchId.current = null
    touchStartSlot.current = null
  }, [detachGlobalTouchListeners])

  return {
    onSlotMouseDown,
    onSlotMouseEnter,
    onMouseUp,
    onSlotTouchStart,
    onSlotTouchEnd,
    onSlotTouchCancel,
    handleNativeTouchMove,
    isDragging: isDraggingState,
  }
}
