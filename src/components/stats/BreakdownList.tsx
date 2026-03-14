import { motion } from 'motion/react'
import { EyeIcon, EyeOffIcon } from '../ui/Icons'

interface BreakdownItem {
  catId: string
  label: string
  color: string
  minutes: number
}

interface BreakdownListProps {
  items: BreakdownItem[]
  hiddenCatIds: Set<string>
  onToggleVisibility: (catId: string) => void
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function BreakdownList({ items, hiddenCatIds, onToggleVisibility }: BreakdownListProps) {
  if (items.length === 0) {
    return <div className="text-xs text-muted text-center py-4">No tracked time</div>
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => {
        const isHidden = hiddenCatIds.has(item.catId)
        return (
          <motion.div
            key={item.catId}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`group flex items-center gap-2 px-1 py-1 rounded-md cursor-pointer transition-colors hover:bg-bg ${
              isHidden ? 'opacity-40' : ''
            }`}
            onClick={() => onToggleVisibility(item.catId)}
          >
            <div className="relative w-2.5 h-2.5 flex-shrink-0">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-opacity ${isHidden ? 'opacity-0' : 'group-hover:opacity-0'}`}
                style={{ backgroundColor: item.color }}
              />
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                isHidden ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                {isHidden
                  ? <EyeOffIcon size={14} className="text-muted -ml-0.5" />
                  : <EyeIcon size={14} className="text-muted -ml-0.5" />
                }
              </div>
            </div>
            <span className="text-sm truncate flex-1">{item.label}</span>
            <span className="text-sm text-muted tabular-nums">{formatDuration(item.minutes)}</span>
          </motion.div>
        )
      })}
    </div>
  )
}
