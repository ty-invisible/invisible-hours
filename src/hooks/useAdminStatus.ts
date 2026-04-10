import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { fetchAdminSelf } from '../lib/adminApi'

export function useAdminStatus(user: User) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchAdminSelf()
      .then((ok) => {
        if (!cancelled) setIsAdmin(ok)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  return { isAdmin, loading }
}
