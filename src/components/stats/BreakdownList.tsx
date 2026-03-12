import { motion } from 'motion/react'

interface BreakdownItem {
  catId: string
  label: string
  color: string
  minutes: number
}

interface BreakdownListProps {
  items: BreakdownItem[]
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function BreakdownList({ items }: BreakdownListProps) {
  if (items.length === 0) {
    return <div className="text-xs text-muted text-center py-4">No tracked time</div>
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => (
        <motion.div
          key={item.catId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-2 px-1 py-1"
        >
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm truncate flex-1">{item.label}</span>
          <span className="text-sm text-muted tabular-nums">{formatDuration(item.minutes)}</span>
        </motion.div>
      ))}
    </div>
  )
}
