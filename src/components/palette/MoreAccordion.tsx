import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRightSmall } from '../ui/Icons'

interface MoreAccordionProps {
  count: number
  children: React.ReactNode
}

export function MoreAccordion({ count, children }: MoreAccordionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center py-3 group cursor-pointer"
      >
        <div className="flex-1 h-px bg-border" />
        <span className="flex items-center gap-1 px-2.5 text-xs text-muted group-hover:text-text transition-colors">
          {open ? `${count} Less` : `${count} More`}
          <span
            className="transition-transform duration-200"
            style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', display: 'flex' }}
          >
            <ChevronRightSmall size={14} />
          </span>
        </span>
        <div className="flex-1 h-px bg-border" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
