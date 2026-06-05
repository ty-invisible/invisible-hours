import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useCategoryStore } from '../../store/categoryStore'

interface MergeCategoriesModalProps {
  onClose: () => void
  onMerge: (sourceCatId: string, targetCatId: string) => Promise<void>
}

export function MergeCategoriesModal({ onClose, onMerge }: MergeCategoriesModalProps) {
  const categories = useCategoryStore((s) => s.categories)
  const [sourceCatId, setSourceCatId] = useState<string>('')
  const [targetCatId, setTargetCatId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const targetOptions = categories.filter((c) => c.catId !== sourceCatId)
  const canMerge = sourceCatId && targetCatId && sourceCatId !== targetCatId && !loading

  const handleMerge = async () => {
    if (!canMerge) return
    setLoading(true)
    try {
      await onMerge(sourceCatId, targetCatId)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-xl border border-border shadow-xl p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-semibold mb-1">Merge Categories</h3>
        <p className="text-sm text-muted mb-5">
          Combine all of the calendar entries from 2 categories into a single category.
        </p>

        <label className="block mb-4">
          <span className="text-xs text-muted mb-1.5 block">This Category:</span>
          <div className="relative">
            <select
              value={sourceCatId}
              onChange={(e) => {
                setSourceCatId(e.target.value)
                if (e.target.value === targetCatId) setTargetCatId('')
              }}
              className={`w-full py-2 pr-3 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none ${
                sourceCatId ? 'pl-9' : 'pl-3 text-muted'
              }`}
            >
              <option value="">Select</option>
              {categories.map((c) => (
                <option key={c.catId} value={c.catId}>{c.label}</option>
              ))}
            </select>
            {sourceCatId && (
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-sm pointer-events-none"
                style={{ backgroundColor: categories.find((c) => c.catId === sourceCatId)?.color }}
              />
            )}
          </div>
        </label>

        <label className="block mb-5">
          <span className="text-xs text-muted mb-1.5 block">Will Merge into This Category:</span>
          <div className="relative">
            <select
              value={targetCatId}
              onChange={(e) => setTargetCatId(e.target.value)}
              className={`w-full py-2 pr-3 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none disabled:opacity-50 ${
                targetCatId ? 'pl-9' : 'pl-3 text-muted'
              }`}
              disabled={!sourceCatId}
            >
              <option value="">Select</option>
              {targetOptions.map((c) => (
                <option key={c.catId} value={c.catId}>{c.label}</option>
              ))}
            </select>
            {targetCatId && (
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-sm pointer-events-none"
                style={{ backgroundColor: categories.find((c) => c.catId === targetCatId)?.color }}
              />
            )}
          </div>
        </label>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted">This action cannot be undone.</span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={!canMerge}
              className="px-4 py-2 text-sm bg-header text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
            >
              {loading ? 'Merging…' : 'Merge'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
