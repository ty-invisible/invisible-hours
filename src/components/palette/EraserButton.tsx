import { useMemo } from 'react'
import { useCategoryStore } from '../../store/categoryStore'
import { EraserIcon } from '../ui/Icons'

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const nr = Math.round(r + (255 - r) * amount)
  const ng = Math.round(g + (255 - g) * amount)
  const nb = Math.round(b + (255 - b) * amount)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

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
