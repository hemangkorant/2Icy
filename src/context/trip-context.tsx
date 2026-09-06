import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

interface TripContextValue {
  trips: Tables<'trips'>[]
  activeTrip: Tables<'trips'> | null
  activeTripId: string | null
  members: Tables<'trip_members'>[]
  loading: boolean
  setActiveTripId: (id: string) => void
  createTrip: (input: { name: string; startDate?: string; endDate?: string }) => Promise<Tables<'trips'>>
  inviteMember: (email: string) => Promise<void>
  refresh: () => Promise<void>
}

const TripContext = createContext<TripContextValue | null>(null)

const ACTIVE_TRIP_KEY = 'iceland-trip:active-trip-id'

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [trips, setTrips] = useState<Tables<'trips'>[]>([])
  const [members, setMembers] = useState<Tables<'trip_members'>[]>([])
  const [activeTripId, setActiveTripIdState] = useState<string | null>(() =>
    window.localStorage.getItem(ACTIVE_TRIP_KEY),
  )
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setTrips([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('trips').select('*').order('start_date', { ascending: true })
    setTrips(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!activeTripId && trips.length > 0) {
      setActiveTripIdState(trips[0].id)
    }
  }, [trips, activeTripId])

  useEffect(() => {
    if (!activeTripId) {
      setMembers([])
      return
    }
    supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', activeTripId)
      .then(({ data }) => setMembers(data ?? []))
  }, [activeTripId])

  const setActiveTripId = useCallback((id: string) => {
    window.localStorage.setItem(ACTIVE_TRIP_KEY, id)
    setActiveTripIdState(id)
  }, [])

  const createTrip = useCallback(
    async (input: { name: string; startDate?: string; endDate?: string }) => {
      if (!user) throw new Error('Must be signed in to create a trip')
      const { data, error } = await supabase
        .from('trips')
        .insert({ name: input.name, start_date: input.startDate, end_date: input.endDate, owner_id: user.id })
        .select()
        .single()
      if (error) throw new Error(error.message)
      await refresh()
      setActiveTripId(data.id)
      return data
    },
    [user, refresh, setActiveTripId],
  )

  const inviteMember = useCallback(
    async (email: string) => {
      if (!activeTripId) throw new Error('No active trip')
      const { error } = await supabase.from('trip_members').insert({
        trip_id: activeTripId,
        invited_email: email.trim().toLowerCase(),
        role: 'editor',
        status: 'invited',
      })
      if (error) throw new Error(error.message)
      const { data } = await supabase.from('trip_members').select('*').eq('trip_id', activeTripId)
      setMembers(data ?? [])
    },
    [activeTripId],
  )

  const value = useMemo<TripContextValue>(
    () => ({
      trips,
      activeTrip: trips.find((t) => t.id === activeTripId) ?? null,
      activeTripId,
      members,
      loading,
      setActiveTripId,
      createTrip,
      inviteMember,
      refresh,
    }),
    [trips, activeTripId, members, loading, setActiveTripId, createTrip, inviteMember, refresh],
  )

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

export function useTrip() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTrip must be used within TripProvider')
  return ctx
}
