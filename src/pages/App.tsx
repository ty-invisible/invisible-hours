import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Login } from './Login'
import { Header } from '../components/layout/Header'
import { PaletteColumn } from '../components/layout/PaletteColumn'
import { CalendarColumn } from '../components/layout/CalendarColumn'
import { StatsColumn } from '../components/layout/StatsColumn'
import { ResizeHandle } from '../components/ui/ResizeHandle'
import { ToastContainer } from '../components/ui/Toast'
import { useUIStore } from '../store/uiStore'
import { useSupabaseSync } from '../hooks/useSupabaseSync'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
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

  return <AuthenticatedApp user={user} />
}

function AuthenticatedApp({ user }: { user: User }) {
  const paletteWidth = useUIStore((s) => s.paletteWidth)
  const statsWidth = useUIStore((s) => s.statsWidth)
  const setPaletteWidth = useUIStore((s) => s.setPaletteWidth)
  const setStatsWidth = useUIStore((s) => s.setStatsWidth)

  const sync = useSupabaseSync(user)
  useKeyboardShortcuts()

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Header user={user} sync={sync} />
      <div className="flex flex-1 min-h-0">
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
        <div className="flex-1 min-w-0 overflow-hidden">
          <CalendarColumn sync={sync} />
        </div>
        <ResizeHandle
          min={200}
          max={480}
          current={statsWidth}
          onResize={setStatsWidth}
          direction="left"
        />
        <div style={{ width: statsWidth }} className="flex-shrink-0 overflow-hidden">
          <StatsColumn />
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
