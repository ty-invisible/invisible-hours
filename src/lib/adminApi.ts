import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export interface AdminUserRow {
  id: string
  email: string
  fullName: string
  createdAt: string | null
  lastSignInAt: string | null
  isAdmin: boolean
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: ANON,
    'Content-Type': 'application/json',
  }
}

export async function fetchAdminSelf(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api?action=self`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: ANON,
    },
  })
  if (!res.ok) return false
  const j = (await res.json()) as { isAdmin?: boolean }
  return !!j.isAdmin
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: 'GET',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error((j as { error?: string }).error || res.statusText)
  }
  const j = (await res.json()) as { users: AdminUserRow[] }
  return j.users
}

export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ userId, isAdmin }),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error((j as { error?: string }).error || res.statusText)
  }
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: 'DELETE',
    headers: await authHeaders(),
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error((j as { error?: string }).error || res.statusText)
  }
}
