import { useCategoryStore } from '../../store/categoryStore'
import { EraserIcon } from '../ui/Icons'

export function EraserButton() {
  const eraserOn = useCategoryStore((s) => s.eraserOn)
  const toggleEraser = useCategoryStore((s) => s.toggleEraser)

  return (
    <button
      onClick={toggleEraser}
      className={`flex-1 h-14 flex flex-col items-center justify-center gap-1 rounded-lg text-xs transition-colors ${
        eraserOn
          ? 'bg-error/10 text-error ring-2 ring-error/40'
          : 'bg-bg text-muted hover:text-text'
      }`}
    >
      <EraserIcon size={18} />
      Erase
    </button>
  )
}
