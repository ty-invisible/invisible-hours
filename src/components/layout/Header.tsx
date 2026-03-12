import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useCalendarStore } from '../../store/calendarStore'
import { useCategoryStore } from '../../store/categoryStore'
import { dateKey, getWeekDates } from '../../lib/slots'
import { buildSummary } from '../../lib/buildSummary'
import { SaveIndicator } from '../ui/SaveIndicator'
import { ChevronLeft, ChevronRight, CopyIcon, UploadIcon, LogOutIcon } from '../ui/Icons'
import { useUIStore } from '../../store/uiStore'
import { RestoreModal } from './RestoreModal'

interface HeaderProps {
  user: User
  sync: {
    bulkImportEntries: (entries: Array<{ date: string; slot_key: string; category_id: string; note: string }>) => Promise<void>
  }
}

export function Header({ user, sync }: HeaderProps) {
  const currentDate = useCalendarStore((s) => s.currentDate)
  const viewMode = useCalendarStore((s) => s.viewMode)
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate)
  const setViewMode = useCalendarStore((s) => s.setViewMode)
  const slotData = useCalendarStore((s) => s.slotData)
  const getCategoryLabel = useCategoryStore((s) => s.getCategoryLabel)
  const addToast = useUIStore((s) => s.addToast)
  const [showRestore, setShowRestore] = useState(false)

  const today = new Date()
  const todayDk = dateKey(today)

  const isToday = viewMode === 'day'
    ? dateKey(currentDate) === todayDk
    : getWeekDates(currentDate).some((d) => dateKey(d) === todayDk) &&
      getWeekDates(today).every((d, i) => dateKey(d) === dateKey(getWeekDates(currentDate)[i]))

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate)
    if (viewMode === 'day') {
      d.setDate(d.getDate() + dir)
    } else {
      d.setDate(d.getDate() + dir * 7)
    }
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  const dateLabel = useMemo(() => {
    if (viewMode === 'day') {
      const opts: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }
      if (currentDate.getFullYear() !== today.getFullYear()) {
        opts.year = 'numeric'
      }
      return currentDate.toLocaleDateString('en-US', opts)
    } else {
      const week = getWeekDates(currentDate)
      const mon = week[0]
      const sun = week[6]
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const yearSuffix = mon.getFullYear() !== today.getFullYear() ? `, ${mon.getFullYear()}` : ''
      return `${fmt(mon)} – ${fmt(sun)}${yearSuffix}`
    }
  }, [currentDate, viewMode, today])

  const handleCopy = () => {
    const dates = viewMode === 'day'
      ? [dateKey(currentDate)]
      : getWeekDates(currentDate).map(dateKey)
    const tsv = buildSummary(dates, slotData, getCategoryLabel)
    navigator.clipboard.writeText(tsv)
    addToast({ message: 'Copied to clipboard', type: 'success' })
  }

  return (
    <>
      <header className="h-[60px] bg-header flex items-center px-4 gap-3 flex-shrink-0" style={{ zIndex: 40 }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-4">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-header font-bold text-xs">IH</span>
          </div>
          <span className="text-white font-semibold text-sm whitespace-nowrap">Invisible Hours</span>
        </div>

        {/* Centre navigation */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>

          <span className="text-white text-sm font-medium min-w-[200px] text-center">
            {dateLabel}
          </span>

          <button
            onClick={() => navigate(1)}
            className="text-white/70 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={22} />
          </button>

          {/* Day / Week toggle */}
          <div className="flex bg-white/10 rounded-lg p-0.5 ml-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'day' ? 'bg-white text-header' : 'text-white/70 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-white text-header' : 'text-white/70 hover:text-white'
              }`}
            >
              Week
            </button>
          </div>

          {/* Today button */}
          <AnimatePresence>
            {!isToday && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                onClick={goToday}
                className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Today
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <SaveIndicator />
          <button
            onClick={handleCopy}
            className="text-white/70 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            title="Copy as TSV"
          >
            <CopyIcon size={20} />
          </button>
          <button
            onClick={() => setShowRestore(true)}
            className="text-white/70 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            title="Restore Backup"
          >
            <UploadIcon size={20} />
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-white/50 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            title="Sign Out"
          >
            <LogOutIcon size={20} />
          </button>
        </div>
      </header>
      {showRestore && (
        <RestoreModal
          onClose={() => setShowRestore(false)}
          onImport={sync.bulkImportEntries}
        />
      )}
    </>
  )
}
