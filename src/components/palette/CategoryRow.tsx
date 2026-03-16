import { memo, useState, useMemo } from 'react'
import { useCategoryStore } from '../../store/categoryStore'
import { contrastColor, lighten } from '../../lib/categories'
import { CategoryEditor } from './CategoryEditor'
import { GripIcon, PencilIcon } from '../ui/Icons'

interface CategoryRowProps {
  catId: string
  label: string
  color: string
  hotkey: string | null
  isActive: boolean
  index: number
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDragEnd: () => void
  onSaveCategories: () => void
  onDeleteAllEntries: (catId: string) => Promise<void>
}

export const CategoryRow = memo(function CategoryRow({
  catId, label, color, hotkey, isActive, index,
  onDragStart, onDragEnter, onDragEnd, onSaveCategories, onDeleteAllEntries,
}: CategoryRowProps) {
  const setActive = useCategoryStore((s) => s.setActive)
  const [showEditor, setShowEditor] = useState(false)
  const [editorAnchor, setEditorAnchor] = useState<{ x: number; y: number } | null>(null)
  const hex = color.length === 7 ? color : '#888888'
  const textColor = contrastColor(hex)

  const bgStyle = useMemo(() => {
    if (!isActive) return { background: hex }
    const l1 = lighten(hex, 0.18)
    const l2 = lighten(hex, 0.3)
    return {
      background: `linear-gradient(-45deg, ${hex}, ${l1}, ${l2}, ${l1}, ${hex})`,
      backgroundSize: '300% 300%',
      animation: 'gradient-flow 6s ease infinite',
    }
  }, [isActive, hex])

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditorAnchor({ x: e.clientX, y: e.clientY })
    setShowEditor(true)
  }

  return (
    <>
      <div className="relative">
        <div
          className={`group relative flex items-center gap-1.5 pl-1.5 pr-2.5 rounded-lg cursor-pointer select-none transition-[padding,filter] duration-200 ease-in-out ${
            isActive ? 'py-[18px]' : 'py-2 hover:brightness-110'
          }`}
          style={{
            color: textColor,
            ...bgStyle,
          }}
          onClick={() => setActive(catId)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer?.setData('text/plain', '')
            onDragStart(index)
          }}
          onDragEnter={() => onDragEnter(index)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="w-7 flex-shrink-0 relative flex items-center justify-center cursor-grab">
            {hotkey && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-mono rounded opacity-60 transition-opacity group-hover:opacity-0"
                style={{
                  color: textColor,
                  backgroundColor: textColor === '#FFFFFF' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)',
                }}
              >
                {hotkey}
              </span>
            )}
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-70 transition-opacity pointer-events-none"
              style={{ color: textColor }}
            >
              <GripIcon size={18} />
            </div>
          </div>

          <span className="text-sm truncate flex-1">{label}</span>

          <button
            onClick={handleEditClick}
            className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity flex-shrink-0 p-0.5"
            style={{ color: textColor }}
          >
            <PencilIcon size={16} />
          </button>
        </div>
      </div>

      {showEditor && editorAnchor && (
        <CategoryEditor
          catId={catId}
          position={editorAnchor}
          onClose={() => setShowEditor(false)}
          onSave={onSaveCategories}
          onDeleteAllEntries={onDeleteAllEntries}
        />
      )}
    </>
  )
})
