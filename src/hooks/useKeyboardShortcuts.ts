import { useEffect } from 'react'
import { useCategoryStore } from '../store/categoryStore'
import { useCalendarStore } from '../store/calendarStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const { categories, setActive, toggleEraser, eraserOn, activeCategoryId } = useCategoryStore.getState()
      const { focusedSlot, clearFocusedSlot, setSlot, slotData, pushUndo } = useCalendarStore.getState()

      // Cmd/Ctrl + Z => undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        useCalendarStore.getState().undo()
        return
      }

      // Number keys 1-9, 0 => select category
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        if (idx < categories.length) {
          setActive(categories[idx].catId)
        }
        return
      }
      if (e.key === '0') {
        if (categories.length >= 10) {
          setActive(categories[9].catId)
        }
        return
      }

      // E => toggle eraser
      if (e.key === 'e' || e.key === 'E') {
        toggleEraser()
        return
      }

      // Escape => clear focused slot, or deselect category/eraser
      if (e.key === 'Escape') {
        if (focusedSlot) {
          const dk = focusedSlot.dateKey
          const daySlots = slotData[dk] || {}
          if (daySlots[focusedSlot.slotKey]) {
            pushUndo({ dateKey: dk, slots: { ...daySlots } })
            setSlot(dk, focusedSlot.slotKey, null)
          }
          clearFocusedSlot()
        } else if (activeCategoryId) {
          setActive(null)
        } else if (eraserOn) {
          toggleEraser()
        }
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
