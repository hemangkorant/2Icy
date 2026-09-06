import { format } from 'date-fns'
import { Plus, Printer, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ItineraryImportButton } from '@/components/common/itinerary-import-dialog'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState, OfflineNotice } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTrip } from '@/context/trip-context'
import { LazyTripMap as TripMap, type MapPoint } from '@/features/map/LazyTripMap'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'
import type { ItineraryDayFormValues, ItineraryStopFormValues } from '@/types/schemas'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import type { ImportedItineraryDay } from '@/lib/itinerary-import'

import { DayForm } from './DayForm'
import { DaylightCard } from './DaylightCard'
import { DayReadiness } from './DayReadiness'
import { StopForm } from './StopForm'
import { StopList } from './StopList'

export function ItineraryPage() {
  const { activeTripId } = useTrip()
  const days = useRealtimeTable('itinerary_days', 'trip_id', activeTripId, { orderBy: 'sort_order' })
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [dayFormOpen, setDayFormOpen] = useState(false)
  const [editingDay, setEditingDay] = useState<Tables<'itinerary_days'> | null>(null)
  const [deletingDay, setDeletingDay] = useState<Tables<'itinerary_days'> | null>(null)

  useEffect(() => {
    if (!selectedDayId && days.data.length > 0) setSelectedDayId(days.data[0].id)
    if (selectedDayId && !days.data.some((d) => d.id === selectedDayId) && days.data.length > 0) {
      setSelectedDayId(days.data[0].id)
    }
  }, [days.data, selectedDayId])

  const selectedDay = days.data.find((d) => d.id === selectedDayId) ?? null

  const handleSaveDay = async (values: ItineraryDayFormValues) => {
    try {
      if (editingDay) {
        await days.update(editingDay.id, {
          date: values.date,
          title: values.title || null,
          overnight_location: values.overnight_location || null,
          overnight_lat: values.overnight_lat ?? null,
          overnight_lng: values.overnight_lng ?? null,
          notes: values.notes || null,
        })
      } else {
        const created = await days.insert({
          trip_id: activeTripId!,
          date: values.date,
          sort_order: days.data.length,
          title: values.title || null,
          overnight_location: values.overnight_location || null,
          overnight_lat: values.overnight_lat ?? null,
          overnight_lng: values.overnight_lng ?? null,
          notes: values.notes || null,
        })
        setSelectedDayId(created.id)
      }
    } catch (e) {
      toast({ title: 'Could not save day', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  if (days.loading) return <LoadingState label="Loading itinerary…" />
  if (days.error) return <ErrorState message={days.error} onRetry={days.refresh} />

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Itinerary"
        description="Day-by-day plan for the trip."
        action={
          <div className="flex gap-2">
            <ItineraryImportButton
              onImport={async (importedDays: ImportedItineraryDay[]) => {
                for (const [dayIndex, importedDay] of importedDays.entries()) {
                  const { data: createdDay, error: dayError } = await supabase
                    .from('itinerary_days')
                    .insert({
                      trip_id: activeTripId!,
                      date: importedDay.date,
                      sort_order: days.data.length + dayIndex,
                      title: importedDay.title || null,
                      overnight_location: importedDay.overnight_location || null,
                      notes: importedDay.notes || null,
                    })
                    .select('id')
                    .single()
                  if (dayError || !createdDay) throw new Error(dayError?.message ?? 'Could not create itinerary day')
                  if (importedDay.stops.length > 0) {
                    const { error: stopsError } = await supabase.from('itinerary_stops').insert(
                      importedDay.stops.map((stop, position) => ({
                        day_id: createdDay.id,
                        position,
                        name: stop.name,
                        activity_notes: stop.activity_notes || null,
                        status: 'planned',
                      })),
                    )
                    if (stopsError) throw new Error(stopsError.message)
                  }
                }
                await days.refresh()
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                setEditingDay(null)
                setDayFormOpen(true)
              }}
            >
              <Plus className="size-4" /> Add day
            </Button>
          </div>
        }
      />

      {days.isOffline && <div className="mb-3"><OfflineNotice savedAt={days.staleSince} /></div>}

      {days.data.length === 0 ? (
        <EmptyState title="No days yet" description="Add your first day to start building the itinerary." />
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {days.data.map((day) => (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={cn(
                  'shrink-0 rounded-lg border border-border px-3 py-2 text-left text-xs',
                  selectedDayId === day.id ? 'border-primary bg-primary/5' : 'bg-card',
                )}
              >
                <p className="font-semibold">{format(new Date(`${day.date}T00:00:00`), 'EEE d MMM')}</p>
                <p className="max-w-28 truncate text-muted-foreground">{day.title || day.overnight_location || 'Untitled'}</p>
              </button>
            ))}
          </div>

          {selectedDay && (
            <DayDetail
              day={selectedDay}
              onEditDay={() => {
                setEditingDay(selectedDay)
                setDayFormOpen(true)
              }}
              onDeleteDay={() => setDeletingDay(selectedDay)}
              onUpdateDay={(patch) => days.update(selectedDay.id, patch)}
            />
          )}
        </>
      )}

      <DayForm open={dayFormOpen} onOpenChange={setDayFormOpen} initial={editingDay} onSubmit={handleSaveDay} />
      <ConfirmDialog
        open={Boolean(deletingDay)}
        onOpenChange={(o) => !o && setDeletingDay(null)}
        title="Delete this day?"
        description="This also removes its stops and driving segments. This cannot be undone."
        destructive
        confirmLabel="Delete day"
        onConfirm={async () => {
          if (deletingDay) {
            await days.remove(deletingDay.id)
            setSelectedDayId(null)
          }
        }}
      />
    </div>
  )
}

function DayDetail({
  day,
  onEditDay,
  onDeleteDay,
  onUpdateDay,
}: {
  day: Tables<'itinerary_days'>
  onEditDay: () => void
  onDeleteDay: () => void
  onUpdateDay: (patch: Partial<Tables<'itinerary_days'>>) => Promise<unknown>
}) {
  const stops = useRealtimeTable('itinerary_stops', 'day_id', day.id, { orderBy: 'position' })
  const segments = useRealtimeTable('driving_segments', 'day_id', day.id)
  const [stopFormOpen, setStopFormOpen] = useState(false)
  const [editingStop, setEditingStop] = useState<Tables<'itinerary_stops'> | null>(null)
  const [deletingStop, setDeletingStop] = useState<Tables<'itinerary_stops'> | null>(null)
  const [notes, setNotes] = useState(day.notes ?? '')

  useEffect(() => setNotes(day.notes ?? ''), [day.id, day.notes])

  const mapPoints: MapPoint[] = stops.data
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s, i) => ({ id: s.id, lat: s.lat as number, lng: s.lng as number, label: s.name, order: i + 1 }))

  const handleSaveStop = async (values: ItineraryStopFormValues) => {
    try {
      if (editingStop) {
        await stops.update(editingStop.id, values)
      } else {
        await stops.insert({ day_id: day.id, position: stops.data.length, ...values })
      }
    } catch (e) {
      toast({ title: 'Could not save stop', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleReorder = async (orderedIds: string[]) => {
    await Promise.all(orderedIds.map((id, index) => stops.update(id, { position: index })))
  }

  const handleSaveSegment = async (
    fromId: string,
    toId: string,
    existing: Tables<'driving_segments'> | undefined,
    distanceKm: number | null,
    durationMinutes: number | null,
  ) => {
    try {
      if (existing) {
        await segments.update(existing.id, { distance_km: distanceKm, duration_minutes: durationMinutes })
      } else {
        await segments.insert({ day_id: day.id, from_stop_id: fromId, to_stop_id: toId, distance_km: distanceKm, duration_minutes: durationMinutes })
      }
    } catch (e) {
      toast({ title: 'Could not save driving segment', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div id="print-area" className="grid flex-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div>
            <h2 className="text-lg font-semibold">{day.title || 'Untitled day'}</h2>
            <p className="text-sm text-muted-foreground">{day.overnight_location ? `Overnight: ${day.overnight_location}` : 'No overnight location set'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={onEditDay}>
              Edit day
            </Button>
            <Button variant="ghost" size="icon" onClick={onDeleteDay} aria-label="Delete day">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {mapPoints.length > 0 && <TripMap points={mapPoints} height={280} />}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Stops</h3>
          <Button
            size="sm"
            variant="outline"
            className="print:hidden"
            onClick={() => {
              setEditingStop(null)
              setStopFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Add stop
          </Button>
        </div>

        {stops.loading ? (
          <LoadingState label="Loading stops…" />
        ) : stops.data.length === 0 ? (
          <EmptyState title="No stops yet" description="Add the places you plan to visit this day." />
        ) : (
          <StopList
            stops={stops.data}
            segments={segments.data}
            onReorder={handleReorder}
            onEdit={(stop) => {
              setEditingStop(stop)
              setStopFormOpen(true)
            }}
            onDelete={(stop) => setDeletingStop(stop)}
            onSaveSegment={handleSaveSegment}
          />
        )}

        <div className="space-y-1.5 print:hidden">
          <h3 className="text-sm font-semibold">Day notes / free time</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdateDay({ notes: notes || null })}
            rows={3}
            placeholder="Flexible plans, backup ideas, reminders…"
          />
        </div>
      </div>

      <div className="space-y-4 print:hidden">
        <DaylightCard date={day.date} lat={day.overnight_lat} lng={day.overnight_lng} />
        <DayReadiness day={day} stopsCount={stops.data.length} />
      </div>

      <StopForm open={stopFormOpen} onOpenChange={setStopFormOpen} initial={editingStop} onSubmit={handleSaveStop} />
      <ConfirmDialog
        open={Boolean(deletingStop)}
        onOpenChange={(o) => !o && setDeletingStop(null)}
        title="Delete this stop?"
        destructive
        confirmLabel="Delete stop"
        onConfirm={async () => {
          if (deletingStop) await stops.remove(deletingStop.id)
        }}
      />
    </div>
  )
}
