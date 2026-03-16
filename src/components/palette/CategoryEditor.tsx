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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    if (!name.trim()) return
    if (isNew) {
      const baseId = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'category'
      let newCatId = baseId
      let n = 2
      while (categories.some((c) => c.catId === newCatId)) {
        newCatId = `${baseId}-${n}`
        n += 1
      }
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-surface border border-border rounded-xl shadow-xl p-6 w-[340px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-base font-semibold mb-4">
          {isNew ? 'New Category' : `Edit ${existing?.label ?? 'Category'}`}
        </h4>

        <label className="block mb-4">
          <span className="text-xs text-muted mb-1 block">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            autoFocus
          />
        </label>

        <div className="mb-4">
          <span className="text-xs text-muted mb-1 block">Colour</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color.length === 7 ? color : '#888888'}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-md cursor-pointer border border-border"
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

        <div
          className="rounded-lg px-4 py-3 mb-5 text-sm font-medium"
          style={{ backgroundColor: color, color: contrastColor(color.length === 7 ? color : '#888888') }}
        >
          {name || 'Preview'}
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleDelete}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
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
            className="text-sm text-muted hover:text-text px-3 py-1.5 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="text-sm bg-header text-white px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
