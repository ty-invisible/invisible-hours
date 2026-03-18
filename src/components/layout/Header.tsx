import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useCalendarStore } from '../../store/calendarStore'
import { useCategoryStore } from '../../store/categoryStore'
import { useGoogleCalendarStore } from '../../store/googleCalendarStore'
import { dateKey, getWeekDates } from '../../lib/slots'
import { buildSummary } from '../../lib/buildSummary'
import { ChevronLeft, ChevronRight, CopyIcon, UploadIcon, LogOutIcon, SunIcon, MoonIcon, UserIcon, CalendarSyncIcon, UnlinkIcon } from '../ui/Icons'
import { useUIStore } from '../../store/uiStore'
import { useResolvedTheme } from '../../hooks/useThemeSync'
import { useIsMobile } from '../../hooks/useIsMobile'
import { RestoreModal } from './RestoreModal'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

interface HeaderProps {
  user: User
  sync: {
    bulkImportEntries: (entries: Array<{ date: string; slot_key: string; category_id: string; note: string }>) => Promise<void>
  }
  gcalSync?: {
    linkGoogleCalendar: (code: string, redirectUri: string) => Promise<boolean>
    unlinkGoogleCalendar: () => Promise<void>
  }
}

export function Header({ user, sync, gcalSync }: HeaderProps) {
  const isMobile = useIsMobile()
  const currentDate = useCalendarStore((s) => s.currentDate)
  const viewMode = useCalendarStore((s) => s.viewMode)
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate)
  const setViewMode = useCalendarStore((s) => s.setViewMode)
  const slotData = useCalendarStore((s) => s.slotData)
  const getCategoryLabel = useCategoryStore((s) => s.getCategoryLabel)
  const addToast = useUIStore((s) => s.addToast)
  const setTheme = useUIStore((s) => s.setTheme)
  const showWeekends = useUIStore((s) => s.showWeekends)
  const setShowWeekends = useUIStore((s) => s.setShowWeekends)
  const resolvedTheme = useResolvedTheme()
  const [showRestore, setShowRestore] = useState(false)

  const todayDk = dateKey(new Date())

  const isToday = useMemo(() => {
    if (viewMode === 'day') return dateKey(currentDate) === todayDk
    const week = getWeekDates(currentDate)
    const todayWeek = getWeekDates(new Date())
    return week.some((d) => dateKey(d) === todayDk) &&
      todayWeek.every((d, i) => dateKey(d) === dateKey(week[i]))
  }, [currentDate, viewMode, todayDk])

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate)
    if (viewMode === 'day') {
      d.setDate(d.getDate() + dir)
    } else {
      d.setDate(d.getDate() + dir * 7)
    }
    setCurrentDate(d, dir)
  }

  const goToday = () => setCurrentDate(new Date())

  const dateLabel = useMemo(() => {
    const thisYear = new Date().getFullYear()
    if (viewMode === 'day') {
      if (isMobile) {
        const opts: Intl.DateTimeFormatOptions = {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }
        if (currentDate.getFullYear() !== thisYear) opts.year = 'numeric'
        return currentDate.toLocaleDateString('en-US', opts)
      }
      const opts: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }
      if (currentDate.getFullYear() !== thisYear) {
        opts.year = 'numeric'
      }
      return currentDate.toLocaleDateString('en-US', opts)
    } else {
      const week = getWeekDates(currentDate)
      const mon = week[0]
      const sun = week[6]
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const yearSuffix = mon.getFullYear() !== thisYear ? `, ${mon.getFullYear()}` : ''
      return `${fmt(mon)} – ${fmt(sun)}${yearSuffix}`
    }
  }, [currentDate, viewMode, isMobile])

  const handleCopy = () => {
    const dates = viewMode === 'day'
      ? [dateKey(currentDate)]
      : getWeekDates(currentDate).map(dateKey)
    const tsv = buildSummary(dates, slotData, getCategoryLabel)
    navigator.clipboard.writeText(tsv)
    addToast({ message: 'Copied to clipboard', type: 'success' })
  }

  if (isMobile) {
    return (
      <>
        <header className="bg-header flex-shrink-0 px-3" style={{ zIndex: 40 }}>
          {/* Row 1: brand + date nav */}
          <div className="h-11 flex items-center gap-2">
            <span className="text-white font-semibold text-xs whitespace-nowrap">IH™</span>
            <div className="flex-1 flex items-center justify-center gap-1">
              <button
                onClick={() => navigate(-1)}
                className="text-white/70 active:text-white w-8 h-8 flex items-center justify-center rounded-lg"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-white text-xs font-medium text-center">
                {dateLabel}
              </span>
              <button
                onClick={() => navigate(1)}
                className="text-white/70 active:text-white w-8 h-8 flex items-center justify-center rounded-lg"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {!isToday && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={goToday}
                  className="px-2.5 py-1 rounded-md bg-accent text-white text-xs font-medium"
                >
                  Today
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Row 2: toggles + action icons */}
          <div className="h-9 flex items-center gap-1.5 pb-1">
            <div className="flex bg-white/10 rounded-md p-0.5">
              <button
                onClick={() => setViewMode('day')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'day' ? 'bg-white text-header' : 'text-white/70'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'week' ? 'bg-white text-header' : 'text-white/70'
                }`}
              >
                Week
              </button>
            </div>

            <AnimatePresence>
              {viewMode === 'week' && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="flex bg-white/10 rounded-md p-0.5">
                    <button
                      onClick={() => setShowWeekends(false)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        !showWeekends ? 'bg-white text-header' : 'text-white/70'
                      }`}
                    >
                      5d
                    </button>
                    <button
                      onClick={() => setShowWeekends(true)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        showWeekends ? 'bg-white text-header' : 'text-white/70'
                      }`}
                    >
                      7d
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1" />

            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="text-white/70 active:text-white w-8 h-8 flex items-center justify-center rounded-lg"
            >
              {resolvedTheme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
            <button
              onClick={handleCopy}
              className="text-white/70 active:text-white w-8 h-8 flex items-center justify-center rounded-lg"
            >
              <CopyIcon size={16} />
            </button>
            <AccountMenu gcalSync={gcalSync} mobile />
          
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

  return (
    <>
      <header className="h-[60px] bg-header flex items-center px-4 gap-3 flex-shrink-0" style={{ zIndex: 40 }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-4">
          <span className="text-white font-semibold text-sm whitespace-nowrap">Invisible Hours™</span>
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

          {/* 5d / 7d toggle — only in week view */}
          <AnimatePresence>
            {viewMode === 'week' && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden ml-1"
              >
                <div className="flex bg-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => setShowWeekends(false)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      !showWeekends ? 'bg-white text-header' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    5d
                  </button>
                  <button
                    onClick={() => setShowWeekends(true)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      showWeekends ? 'bg-white text-header' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    7d
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Today button - fixed width so Day/Week and date don't shift */}
          <div className="w-[72px] flex justify-end">
            <AnimatePresence initial={false}>
              {!isToday && (
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.18 }}
                  onClick={goToday}
                  className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90"
                >
                  Today
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="text-white/70 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedTheme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>
          <button
            onClick={handleCopy}
            className="text-white/70 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            title="Copy Table"
          >
            <CopyIcon size={20} />
          </button>
          <AccountMenu gcalSync={gcalSync} />
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

function AccountMenu({ gcalSync, mobile }: {
  gcalSync?: HeaderProps['gcalSync']
  mobile?: boolean
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const gcalLinked = useGoogleCalendarStore((s) => s.linked)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleGcalConnect = () => {
    if (!GOOGLE_CLIENT_ID) return
    const redirectUri = `${window.location.origin}${window.location.pathname}`
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: 'google-calendar',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const handleGcalDisconnect = () => {
    gcalSync?.unlinkGoogleCalendar()
    setOpen(false)
  }

  const iconSize = mobile ? 16 : 20
  const btnClass = mobile
    ? 'text-white/70 active:text-white w-8 h-8 flex items-center justify-center rounded-lg'
    : 'text-white/70 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={btnClass}
        title="Account"
      >
        <UserIcon size={iconSize} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ zIndex: 50 }}
          >
            {GOOGLE_CLIENT_ID && (
              gcalLinked ? (
                <button
                  onClick={handleGcalDisconnect}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-muted hover:text-text hover:bg-bg transition-colors"
                >
                  <UnlinkIcon size={15} />
                  Disconnect Google Calendar
                </button>
              ) : (
                <button
                  onClick={handleGcalConnect}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-muted hover:text-text hover:bg-bg transition-colors"
                >
                  <CalendarSyncIcon size={15} />
                  Connect Google Calendar
                </button>
              )
            )}
            <button
              onClick={() => { setOpen(false); supabase.auth.signOut() }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-muted hover:text-text hover:bg-bg transition-colors border-t border-border"
            >
              <LogOutIcon size={15} />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
