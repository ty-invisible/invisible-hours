import { memo, useState } from 'react'
import { motion } from 'motion/react'
import { useCategoryStore } from '../../store/categoryStore'
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
        className={`group flex items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer select-none transition-colors ${
          isActive
            ? 'ring-2 ring-inset ring-accent bg-accent/5'
            : 'hover:bg-bg'
        }`}
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
        {/* Drag handle */}
        <div className="text-muted opacity-0 group-hover:opacity-60 transition-opacity cursor-grab flex-shrink-0">
          <GripIcon size={18} />
        </div>

        {/* Hotkey badge */}
        {hotkey && (
          <span className="text-xs font-mono text-muted w-5 text-center flex-shrink-0">
            {hotkey}
          </span>
        )}

        {/* Color dot + label */}
        <div
          className="w-4 h-4 rounded flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm truncate flex-1">{label}</span>

        {/* Edit button */}
        <button
          onClick={handleEditClick}
          className="text-muted opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0 p-0.5"
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
