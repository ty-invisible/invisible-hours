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
        className="w-full text-left text-sm text-muted hover:text-text px-2 py-2 transition-colors flex items-center gap-1.5"
      >
        <span className="transition-transform" style={{ transform: open ? 'rotate(90deg)' : '', display: 'flex' }}>
          <ChevronRightSmall size={16} />
        </span>
        {open ? 'Less' : `More (${count})`}
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
