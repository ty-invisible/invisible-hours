import { useEffect, useCallback, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useCalendarStore } from '../store/calendarStore'
import { useGoogleCalendarStore } from '../store/googleCalendarStore'
import { dateKey, getWeekDates } from '../lib/slots'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const REFETCH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export function useGoogleCalendarSync(user: User | null) {
  const fetchedRanges = useRef<Set<string>>(new Set())

  const checkLinked = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('google_calendar_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    useGoogleCalendarStore.getState().setLinked(!!data)
  }, [user])

  const fetchEvents = useCallback(async (from: string, to: string) => {
    if (!user) return
    const { linked } = useGoogleCalendarStore.getState()
    if (!linked) return

    const rangeKey = `${from}:${to}`
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    useGoogleCalendarStore.getState().setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({
          from,
          to,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timeMin: new Date(`${from}T00:00:00`).toISOString(),
          timeMax: new Date(`${to}T23:59:59.999`).toISOString(),
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        console.error('[Google Calendar] events fetch failed', res.status, errBody)
        if (res.status === 404) {
          useGoogleCalendarStore.getState().setLinked(false)
        }
        return
      }

      const data = await res.json()
      const events = Array.isArray(data?.events) ? data.events : []
      if (events.length === 0 && data?.events !== undefined) {
        console.warn('[Google Calendar] no events in range (or all all-day)', { from, to })
      }

      const byDate: Record<string, typeof events> = {}
      for (const event of events) {
        if (event.allDay) continue
        const startDate = new Date(event.start)
        const endDate = new Date(event.end)

        const d = new Date(startDate)
        d.setHours(0, 0, 0, 0)
        const endDay = new Date(endDate)
        endDay.setHours(0, 0, 0, 0)

        while (d <= endDay) {
          const dk = dateKey(d)
          if (!byDate[dk]) byDate[dk] = []
          byDate[dk].push(event)
          d.setDate(d.getDate() + 1)
        }
      }

      useGoogleCalendarStore.getState().setEventsForDates(byDate)
      fetchedRanges.current.add(rangeKey)
      if (events.length > 0) {
        console.log('[Google Calendar] loaded', events.length, 'events for', Object.keys(byDate).join(', '))
      }
    } finally {
      useGoogleCalendarStore.getState().setLoading(false)
    }
  }, [user])

  const fetchCurrentView = useCallback(async () => {
    const { currentDate, viewMode } = useCalendarStore.getState()
    if (viewMode === 'day') {
      const dk = dateKey(currentDate)
      await fetchEvents(dk, dk)
    } else {
      const weekDates = getWeekDates(currentDate)
      const from = dateKey(weekDates[0])
      const to = dateKey(weekDates[6])
      await fetchEvents(from, to)
    }
  }, [fetchEvents])

  useEffect(() => {
    if (!user) return
    checkLinked().then(() => {
      fetchCurrentView()
    })
  }, [user, checkLinked, fetchCurrentView])

  useEffect(() => {
    let prev = {
      date: dateKey(useCalendarStore.getState().currentDate),
      mode: useCalendarStore.getState().viewMode,
    }
    const unsub = useCalendarStore.subscribe((state) => {
      const next = { date: dateKey(state.currentDate), mode: state.viewMode }
      if (next.date !== prev.date || next.mode !== prev.mode) {
        prev = next
        fetchCurrentView()
      }
    })
    return unsub
  }, [fetchCurrentView])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchedRanges.current.clear()
      fetchCurrentView()
    }, REFETCH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchCurrentView])

  useEffect(() => {
    const handleFocus = () => {
      fetchedRanges.current.clear()
      fetchCurrentView()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchCurrentView])

  const linkGoogleCalendar = useCallback(async (code: string, redirectUri: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const res = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-auth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })

    if (res.ok) {
      useGoogleCalendarStore.getState().setLinked(true)
      fetchCurrentView()
      return true
    }
    return false
  }, [fetchCurrentView])

  const unlinkGoogleCalendar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-disconnect`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
    })

    useGoogleCalendarStore.getState().clearEvents()
  }, [])

  return { linkGoogleCalendar, unlinkGoogleCalendar, checkLinked }
}
