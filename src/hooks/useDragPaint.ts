import { useRef, useCallback, useState } from 'react'
import { useCalendarStore, type SlotData, type SlotEntry } from '../store/calendarStore'
import { useCategoryStore } from '../store/categoryStore'
import { SLOT_INDEX, SLOTS } from '../lib/slots'

interface DragPaintResult {
  onSlotMouseDown: (dk: string, slotKey: string, e: React.MouseEvent) => void
  onSlotMouseEnter: (dk: string, slotKey: string) => void
  onMouseUp: () => void
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
    if (original === null) {
      delete strokeChanges.current[slotKey]
    } else {
      delete strokeChanges.current[slotKey]
    }
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

  const onSlotMouseDown = useCallback((dk: string, slotKey: string, e: React.MouseEvent) => {
    e.preventDefault()

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
      // Toggle clear: if slot already has the active category, erase instead
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

  const onSlotMouseEnter = useCallback((dk: string, slotKey: string) => {
    if (!isDragging.current) return
    if (dk !== dragDateKey.current) return
    if (slotKey === dragLastKey.current) return

    const currentIdx = SLOT_INDEX[slotKey]
    const lastIdx = SLOT_INDEX[dragLastKey.current]

    // Rubber-band: if we re-enter a slot already in the stroke, restore the range
    if (dragStroke.current.has(slotKey)) {
      const minIdx = Math.min(currentIdx, lastIdx)
      const maxIdx = Math.max(currentIdx, lastIdx)

      for (let i = minIdx; i <= maxIdx; i++) {
        restoreSlot(dk, slotKeyFromIndex(i))
      }
    } else {
      // Fill all slots between last and current (handles fast mouse movement)
      fillGap(dk, dragLastKey.current, slotKey)
    }

    dragLastKey.current = slotKey
  }, [restoreSlot, fillGap])

  const onMouseUp = useCallback(() => {
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

  return {
    onSlotMouseDown,
    onSlotMouseEnter,
    onMouseUp,
    isDragging: isDraggingState,
  }
}
