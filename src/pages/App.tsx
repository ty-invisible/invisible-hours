import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { Routes, Route } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Login } from './Login'
import { AdminPage } from './AdminPage'
import { Header } from '../components/layout/Header'
import { PaletteColumn } from '../components/layout/PaletteColumn'
import { CalendarColumn } from '../components/layout/CalendarColumn'
import { StatsColumn } from '../components/layout/StatsColumn'
import { ResizeHandle } from '../components/ui/ResizeHandle'
import { ToastContainer } from '../components/ui/Toast'
import { useUIStore, type MobileTab } from '../store/uiStore'
import { useSupabaseSync } from '../hooks/useSupabaseSync'
import { useGoogleCalendarSync } from '../hooks/useGoogleCalendarSync'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useThemeSync } from '../hooks/useThemeSync'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAdminStatus } from '../hooks/useAdminStatus'
import { SwatchIcon, CalendarIcon, BarChartIcon } from '../components/ui/Icons'

export default function App() {
  useThemeSync()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const authTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false)
      }
    }, 8000)

    supabase.auth.getUser()
      .then(({ data }) => {
        if (!cancelled) {
          setUser(data.user)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          window.clearTimeout(authTimeout)
          setLoading(false)
        }
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setUser(session?.user ?? null)
      }
    })

    return () => {
      cancelled = true
      window.clearTimeout(authTimeout)
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return <AuthenticatedRoutes user={user} />
}

function AuthenticatedRoutes({ user }: { user: User }) {
  const admin = useAdminStatus(user)
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage user={user} admin={admin} />} />
      <Route path="/*" element={<AuthenticatedApp user={user} admin={admin} />} />
    </Routes>
  )
}

function AuthenticatedApp({
  user,
  admin,
}: {
  user: User
  admin: { isAdmin: boolean; loading: boolean }
}) {
  const isMobile = useIsMobile()
  const paletteWidth = useUIStore((s) => s.paletteWidth)
  const statsWidth = useUIStore((s) => s.statsWidth)
  const setPaletteWidth = useUIStore((s) => s.setPaletteWidth)
  const setStatsWidth = useUIStore((s) => s.setStatsWidth)
  const focusMode = useUIStore((s) => s.focusMode)
  const mobileTab = useUIStore((s) => s.mobileTab)
  const addToast = useUIStore((s) => s.addToast)

  const sync = useSupabaseSync(user)
  const gcalSync = useGoogleCalendarSync(user)
  useKeyboardShortcuts()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (code && state === 'google-calendar') {
      const redirectUri = window.location.origin
      window.history.replaceState({}, '', window.location.pathname)
      gcalSync.linkGoogleCalendar(code, redirectUri).then((ok) => {
        if (ok) {
          addToast({ message: 'Google Calendar connected', type: 'success' })
        } else {
          addToast({ message: 'Failed to connect Google Calendar', type: 'error' })
        }
      })
    }
  }, [])

  if (isMobile) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <Header user={user} sync={sync} gcalSync={gcalSync} showAdminLink={admin.isAdmin && !admin.loading} />
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === 'palette' && <PaletteColumn sync={sync} />}
          {mobileTab === 'calendar' && <CalendarColumn sync={sync} />}
          {mobileTab === 'stats' && <StatsColumn sync={sync} />}
        </div>
        <MobileTabBar />
        <ToastContainer />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Header user={user} sync={sync} gcalSync={gcalSync} showAdminLink={admin.isAdmin && !admin.loading} />
      <div className="flex flex-1 min-h-0">
        {!focusMode && (
          <>
            <div style={{ width: paletteWidth }} className="flex-shrink-0 overflow-hidden">
              <PaletteColumn sync={sync} />
            </div>
            <ResizeHandle
              min={140}
              max={400}
              current={paletteWidth}
              onResize={setPaletteWidth}
              direction="right"
            />
          </>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <CalendarColumn sync={sync} />
        </div>
        {!focusMode && (
          <>
            <ResizeHandle
              min={200}
              max={480}
              current={statsWidth}
              onResize={setStatsWidth}
              direction="left"
            />
            <div style={{ width: statsWidth }} className="flex-shrink-0 overflow-hidden">
              <StatsColumn sync={sync} />
            </div>
          </>
        )}
      </div>
      <ToastContainer />
    </div>
  )
}

const TABS: { id: MobileTab; label: string; Icon: typeof CalendarIcon }[] = [
  { id: 'palette', label: 'Categories', Icon: SwatchIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'stats', label: 'Stats', Icon: BarChartIcon },
]

function MobileTabBar() {
  const mobileTab = useUIStore((s) => s.mobileTab)
  const setMobileTab = useUIStore((s) => s.setMobileTab)

  return (
    <nav className="flex-shrink-0 bg-surface border-t border-border flex" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {TABS.map(({ id, label, Icon }) => {
        const active = mobileTab === id
        return (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
              active ? 'text-accent' : 'text-muted'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
