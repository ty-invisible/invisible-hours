import { useMemo } from 'react'
import { useCategoryStore } from '../../store/categoryStore'
import { lighten } from '../../lib/categories'
import { EraserIcon } from '../ui/Icons'

const ERROR_HEX = '#DC2626'

export function EraserButton() {
  const eraserOn = useCategoryStore((s) => s.eraserOn)
  const toggleEraser = useCategoryStore((s) => s.toggleEraser)

  const bgStyle = useMemo(() => {
    if (!eraserOn) return undefined
    const l1 = lighten(ERROR_HEX, 0.82)
    const l2 = lighten(ERROR_HEX, 0.9)
    return {
      background: `linear-gradient(-45deg, ${l2}, ${l1}, ${l2}, ${l1}, ${l2})`,
      backgroundSize: '300% 300%',
      animation: 'gradient-flow 6s ease infinite',
    }
  }, [eraserOn])

  return (
    <button
      onClick={toggleEraser}
      className={`flex-1 h-14 flex flex-col items-center justify-center gap-1 rounded-lg text-xs transition-colors ${
        eraserOn
          ? 'text-error ring-2 ring-error/40'
          : 'bg-bg text-muted hover:text-text'
      }`}
      style={bgStyle}
    >
      <EraserIcon size={18} />
      Erase
    </button>
  )
}
