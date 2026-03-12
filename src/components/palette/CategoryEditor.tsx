import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { useCategoryStore } from '../../store/categoryStore'
import { contrastColor } from '../../lib/categories'

interface CategoryEditorProps {
  catId?: string
  position: { x: number; y: number }
  onClose: () => void
  onSave: () => void
  onDeleteAllEntries: (catId: string) => Promise<void>
}

export function CategoryEditor({ catId, position, onClose, onSave, onDeleteAllEntries }: CategoryEditorProps) {
  const categories = useCategoryStore((s) => s.categories)
  const updateCategory = useCategoryStore((s) => s.updateCategory)
  const addCategory = useCategoryStore((s) => s.addCategory)
  const deleteCategory = useCategoryStore((s) => s.deleteCategory)
  const ref = useRef<HTMLDivElement>(null)

  const isNew = !catId
  const existing = catId ? categories.find((c) => c.catId === catId) : null

  const [name, setName] = useState(existing?.label ?? '')
  const [color, setColor] = useState(existing?.color ?? '#7C3AED')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSave = () => {
    if (!name.trim()) return
    if (isNew) {
      const newCatId = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const maxOrder = Math.max(0, ...categories.map((c) => c.sortOrder))
      addCategory({
        catId: newCatId,
        label: name.trim(),
        color,
        isDefault: false,
        isDeleted: false,
        sortOrder: maxOrder + 1,
      })
    } else if (catId) {
      updateCategory(catId, { label: name.trim(), color })
    }
    onSave()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    if (catId) {
      deleteCategory(catId)
      await onDeleteAllEntries(catId)
      onSave()
    }
    onClose()
  }

  const hexInput = color.startsWith('#') ? color.slice(1) : color
  const handleHexChange = (val: string) => {
    const clean = val.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    if (clean.length === 6) {
      setColor(`#${clean}`)
    } else {
      setColor(`#${clean}`)
    }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="fixed z-50 bg-surface border border-border rounded-xl shadow-xl p-4"
      style={{
        left: Math.min(position.x, window.innerWidth - 280),
        top: Math.min(position.y, window.innerHeight - 340),
        width: 260,
      }}
    >
      <h4 className="text-sm font-semibold mb-3">{isNew ? 'New Category' : 'Edit Category'}</h4>

      <label className="block mb-3">
        <span className="text-xs text-muted mb-1 block">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          autoFocus
        />
      </label>

      <div className="mb-3">
        <span className="text-xs text-muted mb-1 block">Colour</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color.length === 7 ? color : '#888888'}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded-md cursor-pointer border border-border"
          />
          <div className="flex items-center border border-border rounded-lg px-2 py-1 bg-bg flex-1">
            <span className="text-xs text-muted mr-0.5">#</span>
            <input
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              className="bg-transparent text-sm w-full focus:outline-none font-mono"
              maxLength={6}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div
        className="rounded-lg px-3 py-2 mb-4 text-sm font-medium"
        style={{ backgroundColor: color, color: contrastColor(color.length === 7 ? color : '#888888') }}
      >
        {name || 'Preview'}
      </div>

      <div className="flex items-center gap-2">
        {!isNew && (
          <button
            onClick={handleDelete}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              confirmDelete
                ? 'bg-error text-white'
                : 'text-error hover:bg-error/10'
            }`}
          >
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="text-xs text-muted hover:text-text px-2 py-1 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="text-xs bg-header text-white px-3 py-1 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
        >
          Save
        </button>
      </div>
    </motion.div>
  )
}
