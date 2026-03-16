import { useEffect, useRef, useMemo } from 'react'
import { motion } from 'motion/react'
import { useCalendarStore } from '../../store/calendarStore'

interface NotePopupProps {
  dk: string
  slotKey: string
  position: { x: number; y: number }
  onClose: () => void
  onSaveNote: (dk: string, slotKey: string, note: string) => void
}

const POPUP_WIDTH = 240
const POPUP_HEIGHT_ESTIMATE = 120
const MARGIN = 8

export function NotePopup({ dk, slotKey, position, onClose, onSaveNote }: NotePopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const slotData = useCalendarStore((s) => s.slotData)
  const setNote = useCalendarStore((s) => s.setNote)

  const entry = slotData[dk]?.[slotKey]
  const note = entry?.note ?? ''

  const clampedPos = useMemo(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const left = Math.max(MARGIN, Math.min(position.x, vw - POPUP_WIDTH - MARGIN))
    const top = Math.max(MARGIN, Math.min(position.y, vh - POPUP_HEIGHT_ESTIMATE - MARGIN))
    return { left, top }
  }, [position])

  useEffect(() => {
    textareaRef.current?.focus()

    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [onClose])

  const handleChange = (value: string) => {
    setNote(dk, slotKey, value)
    onSaveNote(dk, slotKey, value)
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="fixed z-50 bg-surface border border-border rounded-lg shadow-xl p-3"
      style={{ left: clampedPos.left, top: clampedPos.top, width: POPUP_WIDTH, maxWidth: `calc(100vw - ${MARGIN * 2}px)` }}
    >
      <div className="text-xs text-muted mb-1.5">{slotKey} — Note</div>
      <textarea
        ref={textareaRef}
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        className="w-full h-20 px-2 py-1.5 rounded-md border border-border bg-bg text-text text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="Add a note…"
      />
    </motion.div>
  )
}
