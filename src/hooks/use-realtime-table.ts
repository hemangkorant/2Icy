import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { loadSnapshot, saveSnapshot } from '@/lib/offline-cache'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type TableName = keyof Database['public']['Tables']
type Row<T extends TableName> = Database['public']['Tables'][T]['Row']
type InsertPayload<T extends TableName> = Database['public']['Tables'][T]['Insert']
type UpdatePayload<T extends TableName> = Database['public']['Tables'][T]['Update']

// supabase-js can't statically resolve '*' selects or column names for a
// generic table parameter T (the select-string parser needs a concrete
// literal table name). This one narrow escape hatch is used for every
// internal query in this file; every caller of the hook still gets full,
// concrete Row<T>/Insert<T>/Update<T> typing via the casts on each return.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untypedFrom(table: TableName): any {
  return supabase.from(table)
}

/**
 * Mirrors Postgres's default ORDER BY null handling (nulls sort as if larger
 * than any non-null value) so realtime INSERT/UPDATE events — which only
 * patch the locally cached array rather than re-querying — keep the same
 * order the initial server-sorted fetch had, instead of leaving new/edited
 * rows wherever they happened to land.
 */
function sortRows<T extends TableName>(rows: Row<T>[], orderBy: string | undefined, ascending: boolean): Row<T>[] {
  if (!orderBy) return rows
  const compare = (a: Row<T>, b: Row<T>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const av = (a as any)[orderBy]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bv = (b as any)[orderBy]
    const aNull = av === null || av === undefined
    const bNull = bv === null || bv === undefined
    if (aNull && bNull) return 0
    if (aNull) return 1
    if (bNull) return -1
    if (av < bv) return -1
    if (av > bv) return 1
    return 0
  }
  return [...rows].sort((a, b) => (ascending ? compare(a, b) : -compare(a, b)))
}

export class ConflictError<T extends TableName> extends Error {
  current: Row<T>
  constructor(current: Row<T>) {
    super('This record was changed by someone else since you opened it.')
    this.current = current
  }
}

interface UseRealtimeTableOptions {
  orderBy?: string
  ascending?: boolean
  enabled?: boolean
}

/**
 * Generic Supabase CRUD + Realtime hook shared by every feature module.
 * Rows are cached to localStorage on each successful fetch so the view can
 * still render (clearly labeled as possibly stale) when offline.
 */
export function useRealtimeTable<T extends TableName>(
  table: T,
  filterColumn: string,
  filterValue: string | null | undefined,
  options: UseRealtimeTableOptions = {},
) {
  const { orderBy, ascending = true, enabled = true } = options
  const [data, setData] = useState<Row<T>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [staleSince, setStaleSince] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const cacheKey = `${table}:${filterColumn}:${filterValue ?? 'none'}`

  const fetchData = useCallback(async () => {
    if (!filterValue || !enabled) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    let query = untypedFrom(table).select('*').eq(filterColumn, filterValue)
    if (orderBy) query = query.order(orderBy, { ascending })
    const { data: rows, error: fetchError } = await query
    if (fetchError) {
      const cached = loadSnapshot<Row<T>[]>(cacheKey)
      if (cached) {
        setData(cached.data)
        setIsOffline(true)
        setStaleSince(cached.savedAt)
      } else {
        setError(fetchError.message)
      }
      setLoading(false)
      return
    }
    const rowsTyped = (rows ?? []) as Row<T>[]
    setData(rowsTyped)
    setIsOffline(false)
    setStaleSince(null)
    saveSnapshot(cacheKey, rowsTyped)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filterColumn, filterValue, orderBy, ascending, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!filterValue || !enabled) return
    const channel = supabase
      .channel(cacheKey)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table as string, filter: `${filterColumn}=eq.${filterValue}` },
        (payload) => {
          setData((current) => {
            if (payload.eventType === 'INSERT') {
              const newRow = payload.new as Row<T>
              if (current.some((r) => (r as { id: string }).id === (newRow as { id: string }).id)) return current
              return sortRows([...current, newRow], orderBy, ascending)
            }
            if (payload.eventType === 'UPDATE') {
              const newRow = payload.new as Row<T>
              return sortRows(
                current.map((r) => ((r as { id: string }).id === (newRow as { id: string }).id ? newRow : r)),
                orderBy,
                ascending,
              )
            }
            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as Row<T>
              return current.filter((r) => (r as { id: string }).id !== (oldRow as { id: string }).id)
            }
            return current
          })
        },
      )
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
  }, [cacheKey, table, filterColumn, filterValue, enabled, orderBy, ascending])

  const insert = useCallback(
    async (payload: InsertPayload<T>) => {
      const { data: inserted, error: insertError } = await untypedFrom(table).insert(payload).select().single()
      if (insertError) throw new Error(insertError.message)
      return inserted as Row<T>
    },
    [table],
  )

  const update = useCallback(
    async (id: string, patch: UpdatePayload<T>, expectedUpdatedAt?: string | null) => {
      if (expectedUpdatedAt) {
        const { data: current } = await untypedFrom(table).select('*').eq('id', id).maybeSingle()
        const currentRow = current as (Row<T> & { updated_at?: string }) | null
        if (currentRow && 'updated_at' in currentRow && currentRow.updated_at !== expectedUpdatedAt) {
          throw new ConflictError<T>(currentRow as Row<T>)
        }
      }
      const { data: updated, error: updateError } = await untypedFrom(table).update(patch).eq('id', id).select().single()
      if (updateError) throw new Error(updateError.message)
      return updated as Row<T>
    },
    [table],
  )

  const remove = useCallback(
    async (id: string) => {
      const { error: deleteError } = await untypedFrom(table).delete().eq('id', id)
      if (deleteError) throw new Error(deleteError.message)
    },
    [table],
  )

  return { data, loading, error, isOffline, staleSince, refresh: fetchData, insert, update, remove }
}
