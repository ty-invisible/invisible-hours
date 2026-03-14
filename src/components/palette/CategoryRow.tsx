import { memo, useState } from 'react'
import { motion } from 'motion/react'
import { useCategoryStore } from '../../store/categoryStore'
import { contrastColor } from '../../lib/categories'
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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditorAnchor({ x: e.clientX, y: e.clientY })
    setShowEditor(true)
  }

  return (
    <>
      <motion.div
        animate={isActive ? { scale: 1 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`group flex items-center gap-1.5 pl-1.5 pr-2.5 py-2 rounded-lg cursor-pointer select-none transition-all ${
          isActive ? 'ring-2 ring-inset ring-black/25' : 'hover:brightness-110'
        }`}
        style={{ backgroundColor: hex, color: textColor }}
        onClick={() => setActive(catId)}
        draggable
        onDragStart={(e) => {
          (e as unknown as DragEvent).dataTransfer?.setData('text/plain', '')
          onDragStart(index)
        }}
        onDragEnter={() => onDragEnter(index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Number or drag icon (number visible by default, grip on hover) */}
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

        {/* Edit button */}
        <button
          onClick={handleEditClick}
          className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity flex-shrink-0 p-0.5"
          style={{ color: textColor }}
        >
          <PencilIcon size={16} />
        </button>
      </motion.div>

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
