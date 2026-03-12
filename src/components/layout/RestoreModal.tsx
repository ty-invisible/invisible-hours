import { useState } from 'react'
import { motion } from 'motion/react'
import { useCategoryStore } from '../../store/categoryStore'
import { useUIStore } from '../../store/uiStore'

interface RestoreModalProps {
  onClose: () => void
  onImport: (entries: Array<{ date: string; slot_key: string; category_id: string; note: string }>) => Promise<void>
}

export function RestoreModal({ onClose, onImport }: RestoreModalProps) {
  const [tsv, setTsv] = useState('')
  const [loading, setLoading] = useState(false)
  const categories = useCategoryStore((s) => s.categories)
  const addToast = useUIStore((s) => s.addToast)

  const handleImport = async () => {
    if (!tsv.trim()) return
    setLoading(true)

    try {
      const lines = tsv.trim().split('\n').slice(1) // skip header
      const labelToId = new Map(categories.map((c) => [c.label.toLowerCase(), c.catId]))
      const entries: Array<{ date: string; slot_key: string; category_id: string; note: string }> = []

      for (const line of lines) {
        const [date, start, , , category, note] = line.split('\t')
        if (!date || !start || !category) continue

        const catId = labelToId.get(category.toLowerCase()) ?? category.toLowerCase().replace(/\s+/g, '-')
        entries.push({ date: date.trim(), slot_key: start.trim(), category_id: catId, note: note?.trim() || '' })
      }

      await onImport(entries)
      addToast({ message: `Restored ${entries.length} entries`, type: 'success' })
      onClose()
    } catch {
      addToast({ message: 'Failed to parse backup data', type: 'error' })
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
        className="bg-surface rounded-xl border border-border shadow-xl p-6 w-full max-w-lg"
      >
        <h3 className="text-lg font-semibold mb-3">Restore Backup</h3>
        <p className="text-sm text-muted mb-3">
          Paste a previously copied TSV backup below. Existing entries for the same slots will be overwritten.
        </p>
        <textarea
          value={tsv}
          onChange={(e) => setTsv(e.target.value)}
          className="w-full h-40 px-3 py-2 rounded-lg border border-border bg-bg text-text text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
          placeholder="Date	Start	End	Duration	Category	Note"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !tsv.trim()}
            className="px-4 py-2 text-sm bg-header text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
          >
            {loading ? 'Importing…' : 'Import'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
