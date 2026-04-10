import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { Link, Navigate } from 'react-router-dom'
import {
  fetchAdminUsers,
  setUserAdmin,
  deleteAdminUser,
  type AdminUserRow,
} from '../lib/adminApi'
import { useUIStore } from '../store/uiStore'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

export function AdminPage({
  user,
  admin,
}: {
  user: User
  admin: { isAdmin: boolean; loading: boolean }
}) {
  const addToast = useUIStore((s) => s.addToast)
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    setLoadingList(true)
    try {
      const list = await fetchAdminUsers()
      setRows(list)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (!admin.loading && admin.isAdmin) {
      void load()
    }
  }, [admin.loading, admin.isAdmin, load])

  if (admin.loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    )
  }

  if (!admin.isAdmin) {
    return <Navigate to="/" replace />
  }

  const onToggleAdmin = async (row: AdminUserRow, next: boolean) => {
    if (row.id === user.id && !next) {
      addToast({ message: 'You cannot remove your own admin role', type: 'error' })
      return
    }
    setBusyId(row.id)
    try {
      await setUserAdmin(row.id, next)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isAdmin: next } : r)))
      addToast({ message: next ? 'User promoted to admin' : 'Admin access removed', type: 'success' })
    } catch (e) {
      addToast({ message: e instanceof Error ? e.message : 'Update failed', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  const onDelete = async (row: AdminUserRow) => {
    if (row.id === user.id) return
    if (!window.confirm(`Delete account ${row.email}? This cannot be undone.`)) return
    setBusyId(row.id)
    try {
      await deleteAdminUser(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      addToast({ message: 'Account deleted', type: 'success' })
    } catch (e) {
      addToast({ message: e instanceof Error ? e.message : 'Delete failed', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-bg overflow-hidden">
      <header className="flex-shrink-0 h-[52px] px-4 flex items-center gap-4 border-b border-border bg-header">
        <Link
          to="/"
          className="text-white/90 hover:text-white text-sm font-medium"
        >
          ← Back
        </Link>
        <span className="text-white font-semibold text-sm">Admin · Users</span>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {loadError && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 text-error text-sm px-3 py-2">
            {loadError}
            <button type="button" onClick={() => void load()} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        {loadingList ? (
          <div className="text-muted text-sm">Loading users…</div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Email</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Created</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Last login</th>
                  <th className="px-3 py-2.5 font-medium text-center w-[100px]">Admin</th>
                  <th className="px-3 py-2.5 font-medium w-[88px]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const self = row.id === user.id
                  const busy = busyId === row.id
                  return (
                    <tr key={row.id} className="border-b border-border/80 last:border-0">
                      <td className="px-3 py-2 text-text max-w-[180px] truncate" title={row.fullName}>
                        {row.fullName}
                      </td>
                      <td className="px-3 py-2 text-text max-w-[220px] truncate" title={row.email}>
                        {row.email || '—'}
                      </td>
                      <td className="px-3 py-2 text-muted whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                      <td className="px-3 py-2 text-muted whitespace-nowrap">{fmtDate(row.lastSignInAt)}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          className="accent-accent h-4 w-4 cursor-pointer disabled:opacity-40"
                          checked={row.isAdmin}
                          disabled={busy || (self && row.isAdmin)}
                          title={self && row.isAdmin ? 'You cannot remove your own admin role' : undefined}
                          onChange={(e) => void onToggleAdmin(row, e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={busy || self}
                          onClick={() => void onDelete(row)}
                          className="text-xs font-medium text-error hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && !loadError && (
              <div className="px-3 py-8 text-center text-muted text-sm">No users</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
