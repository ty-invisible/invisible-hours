import { useCategoryStore } from '../../store/categoryStore'
import { EraserIcon } from '../ui/Icons'

export function EraserButton() {
  const eraserOn = useCategoryStore((s) => s.eraserOn)
  const toggleEraser = useCategoryStore((s) => s.toggleEraser)

  return (
    <button
      onClick={toggleEraser}
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
        eraserOn
          ? 'bg-error/10 text-error ring-2 ring-error/40'
          : 'text-muted hover:text-text hover:bg-bg'
      }`}
    >
      <EraserIcon size={18} />
      Erase
    </button>
  )
}
