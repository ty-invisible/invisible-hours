import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useCalendarStore, type SlotEntry } from '../store/calendarStore'
import { useCategoryStore } from '../store/categoryStore'
import { useUIStore } from '../store/uiStore'
import { dateKey, getWeekDates } from '../lib/slots'
import type { Category } from '../lib/categories'
import type { User } from '@supabase/supabase-js'

export function useSupabaseSync(user: User | null) {
  const loadedDates = useRef<Set<string>>(new Set())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadCategories = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })

    if (data) {
      const cats: Category[] = data.map((r) => ({
        catId: r.cat_id,
        label: r.label,
        color: r.color,
        isDefault: r.is_default ?? false,
        isDeleted: r.is_deleted ?? false,
        sortOrder: r.sort_order ?? 0,
      }))
      useCategoryStore.getState().setUserCategories(cats)
    }
  }, [user])

  const loadEntriesForDates = useCallback(async (dates: string[]) => {
    if (!user) return
    const newDates = dates.filter((d) => !loadedDates.current.has(d))
    if (newDates.length === 0) return

    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .in('date', newDates)

    if (data) {
      const byDate: Record<string, Record<string, SlotEntry>> = {}
      for (const d of newDates) {
        byDate[d] = {}
      }
      for (const row of data) {
        if (!byDate[row.date]) byDate[row.date] = {}
        byDate[row.date][row.slot_key] = {
          categoryId: row.category_id,
          note: row.note || '',
        }
      }
      useCalendarStore.getState().mergeSlotData(byDate)
      newDates.forEach((d) => loadedDates.current.add(d))
    }
  }, [user])

  const loadCurrentView = useCallback(async () => {
    const { currentDate, viewMode } = useCalendarStore.getState()
    if (viewMode === 'day') {
      await loadEntriesForDates([dateKey(currentDate)])
    } else {
      const weekDates = getWeekDates(currentDate)
      await loadEntriesForDates(weekDates.map(dateKey))
    }
  }, [loadEntriesForDates])

  // Optional Supabase table for cross-device sync: create table user_settings (user_id uuid primary key, work_day_start smallint default 18, work_day_end smallint default 35);
  const loadUserSettings = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('work_day_start, work_day_end')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data?.work_day_start != null && data?.work_day_end != null) {
        const s = Math.max(0, Math.min(47, Number(data.work_day_start)))
        const e = Math.max(0, Math.min(47, Number(data.work_day_end)))
        useUIStore.getState().setWorkDayRange(s, e)
      }
    } catch {
      // user_settings table may not exist; keep localStorage defaults
    }
  }, [user])

  // Initial load
  useEffect(() => {
    if (!user) return
    loadCategories()
    loadCurrentView()
    loadUserSettings()
  }, [user, loadCategories, loadCurrentView, loadUserSettings])

  // Reload when date/view changes
  useEffect(() => {
    let prev = {
      date: dateKey(useCalendarStore.getState().currentDate),
      mode: useCalendarStore.getState().viewMode,
    }
    const unsub = useCalendarStore.subscribe((state) => {
      const next = { date: dateKey(state.currentDate), mode: state.viewMode }
      if (next.date !== prev.date || next.mode !== prev.mode) {
        prev = next
        loadCurrentView()
      }
    })
    return unsub
  }, [loadCurrentView])

  const setSaveStatus = useUIStore.getState().setSaveStatus

  const saveEntries = useCallback(async (dk: string, changes: Record<string, SlotEntry | null>) => {
    if (!user) return
    setSaveStatus('saving')

    const upserts: Array<{
      user_id: string; date: string; slot_key: string; category_id: string; note: string
    }> = []
    const deletes: string[] = []

    for (const [slotKey, entry] of Object.entries(changes)) {
      if (entry === null) {
        deletes.push(slotKey)
      } else {
        upserts.push({
          user_id: user.id,
          date: dk,
          slot_key: slotKey,
          category_id: entry.categoryId,
          note: entry.note,
        })
      }
    }

    if (upserts.length > 0) {
      await supabase.from('time_entries').upsert(upserts, { onConflict: 'user_id,date,slot_key' })
    }
    if (deletes.length > 0) {
      await supabase
        .from('time_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('date', dk)
        .in('slot_key', deletes)
    }

    setSaveStatus('saved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [user, setSaveStatus])

  const saveNote = useCallback(async (dk: string, slotKey: string, note: string) => {
    if (!user) return
    setSaveStatus('saving')

    await supabase
      .from('time_entries')
      .update({ note, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('date', dk)
      .eq('slot_key', slotKey)

    setSaveStatus('saved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [user, setSaveStatus])

  const saveCategories = useCallback(async () => {
    if (!user) return
    setSaveStatus('saving')

    const { userCategories } = useCategoryStore.getState()
    const upserts = userCategories.map((c) => ({
      user_id: user.id,
      cat_id: c.catId,
      label: c.label,
      color: c.color,
      is_default: c.isDefault,
      is_deleted: c.isDeleted,
      sort_order: c.sortOrder,
    }))

    if (upserts.length > 0) {
      await supabase.from('user_categories').upsert(upserts, { onConflict: 'user_id,cat_id' })
    }

    setSaveStatus('saved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [user, setSaveStatus])

  const deleteAllEntriesForCategory = useCallback(async (catId: string) => {
    if (!user) return
    await supabase.from('time_entries').delete().eq('user_id', user.id).eq('category_id', catId)
    // Reload current view to reflect deletions in state
    loadedDates.current.clear()
    await loadCurrentView()
  }, [user, loadCurrentView])

  const bulkImportEntries = useCallback(async (
    entries: Array<{ date: string; slot_key: string; category_id: string; note: string }>
  ) => {
    if (!user) return
    setSaveStatus('saving')

    const rows = entries.map((e) => ({ ...e, user_id: user.id }))
    await supabase.from('time_entries').upsert(rows, { onConflict: 'user_id,date,slot_key' })

    loadedDates.current.clear()
    await loadCurrentView()
    setSaveStatus('saved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [user, setSaveStatus, loadCurrentView])

  const saveWorkDayRange = useCallback(async () => {
    if (!user) return
    try {
      const { workDayStartIndex, workDayEndIndex } = useUIStore.getState()
      await supabase.from('user_settings').upsert(
        { user_id: user.id, work_day_start: workDayStartIndex, work_day_end: workDayEndIndex },
        { onConflict: 'user_id' }
      )
    } catch {
      // user_settings table may not exist; localStorage already updated by setWorkDayRange
    }
  }, [user])

  return {
    saveEntries,
    saveNote,
    saveCategories,
    deleteAllEntriesForCategory,
    bulkImportEntries,
    loadCurrentView,
    saveWorkDayRange,
  }
}
