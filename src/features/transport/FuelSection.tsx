import { zodResolver } from '@hookform/resolvers/zod'
import { IconGasStation, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import { formatFriendlyDateTime } from '@/lib/dates'
import { googleMapsSearchUrl } from '@/lib/routing-adapter'
import type { Tables } from '@/types/database'
import { type FuelEntryFormInput, type FuelEntryFormValues, fuelEntrySchema } from '@/types/schemas'

export function FuelSection() {
  const { activeTripId } = useTrip()
  const entries = useRealtimeTable('fuel_entries', 'trip_id', activeTripId, { orderBy: 'filled_at' })
  const cars = useRealtimeTable('rental_cars', 'trip_id', activeTripId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'fuel_entries'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'fuel_entries'> | null>(null)

  const totals = useMemo(() => {
    const totalSpend = entries.data.reduce((sum, e) => sum + (e.amount_paid ?? 0), 0)
    const totalLiters = entries.data.reduce((sum, e) => sum + (e.liters ?? 0), 0)
    const avgPrice = totalLiters > 0 ? totalSpend / totalLiters : 0
    const byDay = new Map<string, number>()
    for (const e of entries.data) {
      const day = e.filled_at.slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + (e.amount_paid ?? 0))
    }
    return { totalSpend, totalLiters, avgPrice, byDay }
  }, [entries.data])

  if (entries.loading) return <LoadingState label="Loading fuel log…" />
  if (entries.error) return <ErrorState message={entries.error} onRetry={entries.refresh} />

  const handleSubmit = async (values: FuelEntryFormValues) => {
    try {
      const payload = {
        station_name: values.station_name || null,
        lat: values.lat ?? null,
        lng: values.lng ?? null,
        filled_at: values.filled_at,
        price_per_liter: values.price_per_liter ?? null,
        amount_paid: values.amount_paid ?? null,
        liters: values.liters ?? null,
        odometer: values.odometer ?? null,
        notes: values.notes || null,
        rental_car_id: cars.data[0]?.id ?? null,
      }
      if (editing) await entries.update(editing.id, payload)
      else await entries.insert({ trip_id: activeTripId!, ...payload })
      setFormOpen(false)
    } catch (e) {
      toast({ title: 'Could not save fuel entry', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total spend</p>
            <p className="text-lg font-semibold">{totals.totalSpend.toFixed(0)} ISK</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total litres</p>
            <p className="text-lg font-semibold">{totals.totalLiters.toFixed(1)} L</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Avg price/L</p>
            <p className="text-lg font-semibold">{totals.avgPrice.toFixed(1)} ISK</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <IconPlus className="size-4" /> Log fuel stop
        </Button>
      </div>

      {entries.data.length === 0 ? (
        <EmptyState
          icon={<IconGasStation className="size-8" />}
          title="No fuel entries yet"
          description="Log fill-ups to track spend across the trip."
        />
      ) : (
        <div className="space-y-2">
          {entries.data.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-start justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">{entry.station_name || 'Fuel stop'}</p>
                  <p className="text-xs text-muted-foreground">{formatFriendlyDateTime(entry.filled_at)}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.liters ?? '—'} L · {entry.price_per_liter ?? '—'} ISK/L · {entry.amount_paid ?? '—'} ISK paid
                    {entry.odometer ? ` · ${entry.odometer} km odo` : ''}
                  </p>
                  {entry.station_name && (
                    <a
                      href={googleMapsSearchUrl(entry.station_name)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-link hover:underline"
                    >
                      Open in Maps
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(entry)
                      setFormOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(entry)} aria-label="Delete">
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FuelForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this fuel entry?"
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) await entries.remove(deleting.id)
        }}
      />
    </div>
  )
}

function FuelForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'fuel_entries'> | null
  onSubmit: (values: FuelEntryFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FuelEntryFormInput, unknown, FuelEntryFormValues>({ resolver: zodResolver(fuelEntrySchema) })

  useEffect(() => {
    if (open) {
      reset({
        station_name: initial?.station_name ?? '',
        lat: initial?.lat ?? undefined,
        lng: initial?.lng ?? undefined,
        filled_at: initial?.filled_at?.slice(0, 16) ?? new Date().toISOString().slice(0, 16),
        price_per_liter: initial?.price_per_liter ?? undefined,
        amount_paid: initial?.amount_paid ?? undefined,
        liters: initial?.liters ?? undefined,
        odometer: initial?.odometer ?? undefined,
        notes: initial?.notes ?? '',
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit fuel entry' : 'Log fuel stop'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="station_name">Station name</Label>
            <Input id="station_name" {...register('station_name')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filled_at">Date/time</Label>
            <Input id="filled_at" type="datetime-local" {...register('filled_at')} />
            {errors.filled_at && <p className="text-sm text-destructive">{errors.filled_at.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="liters">Litres</Label>
              <Input id="liters" type="number" step="any" {...register('liters')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price_per_liter">Price/L</Label>
              <Input id="price_per_liter" type="number" step="any" {...register('price_per_liter')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount_paid">Amount paid</Label>
              <Input id="amount_paid" type="number" step="any" {...register('amount_paid')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="odometer">Odometer (km)</Label>
            <Input id="odometer" type="number" {...register('odometer')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SuggestedFuelStops() {
  const { activeTripId } = useTrip()
  const days = useRealtimeTable('itinerary_days', 'trip_id', activeTripId, { orderBy: 'date' })
  const [selectedDay, setSelectedDay] = useState<string>('')
  const stops = useRealtimeTable('suggested_fuel_stops', 'day_id', selectedDay || null)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!selectedDay && days.data.length > 0) setSelectedDay(days.data[0].id)
  }, [days.data, selectedDay])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Suggested fuel stops by day</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedDay} onValueChange={setSelectedDay}>
          <SelectTrigger>
            <SelectValue placeholder="Select a day" />
          </SelectTrigger>
          <SelectContent>
            {days.data.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.date} — {d.title || d.overnight_location || 'Untitled'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedDay && (
          <>
            <div className="space-y-1.5">
              {stops.data.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-sm">
                  <span>{s.name}</span>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => stops.remove(s.id)} aria-label="Remove">
                    <IconTrash className="size-3.5" />
                  </Button>
                </div>
              ))}
              {stops.data.length === 0 && <p className="text-xs text-muted-foreground">No suggested stops for this day yet.</p>}
            </div>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Station name" className="h-8 text-sm" />
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!name.trim()) return
                  await stops.insert({ day_id: selectedDay, name: name.trim() })
                  setName('')
                }}
              >
                <IconPlus className="size-3.5" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
