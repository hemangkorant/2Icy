import { zodResolver } from '@hookform/resolvers/zod'
import { Plane, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { BookingImportButton } from '@/components/common/booking-import-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
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
import { formatFriendlyDateTime, relativeToNow } from '@/lib/dates'
import type { ImportedFlight } from '@/lib/booking-import'
import type { Tables } from '@/types/database'
import { type FlightFormInput, type FlightFormValues, flightSchema } from '@/types/schemas'

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary' | 'success'> = {
  scheduled: 'secondary',
  delayed: 'destructive',
  cancelled: 'destructive',
  completed: 'success',
}

export function FlightsSection() {
  const { activeTripId } = useTrip()
  const flights = useRealtimeTable('flights', 'trip_id', activeTripId, { orderBy: 'departure_at' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'flights'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'flights'> | null>(null)

  if (flights.loading) return <LoadingState label="Loading flights…" />
  if (flights.error) return <ErrorState message={flights.error} onRetry={flights.refresh} />

  const handleSubmit = async (values: FlightFormValues) => {
    try {
      const payload = {
        airline: values.airline || null,
        flight_number: values.flight_number || null,
        departure_airport: values.departure_airport || null,
        arrival_airport: values.arrival_airport || null,
        departure_at: values.departure_at || null,
        arrival_at: values.arrival_at || null,
        booking_reference: values.booking_reference || null,
        seats: values.seats || null,
        baggage_allowance: values.baggage_allowance || null,
        terminal: values.terminal || null,
        gate: values.gate || null,
        status: values.status,
        notes: values.notes || null,
      }
      if (editing) await flights.update(editing.id, payload)
      else await flights.insert({ trip_id: activeTripId!, ...payload })
      setFormOpen(false)
    } catch (e) {
      toast({ title: 'Could not save flight', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <BookingImportButton
            kind="flight"
            onImport={async (bookings) => {
              for (const booking of bookings) {
                const { kind: _kind, ...flight } = booking as ImportedFlight
                void _kind
                await flights.insert({ trip_id: activeTripId!, ...flight })
              }
            }}
          />
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" /> Add flight
        </Button>
        </div>
      </div>

      {flights.data.length === 0 ? (
        <EmptyState icon={<Plane className="size-8" />} title="No flights yet" description="Add your flight details to see countdowns on the dashboard." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {flights.data.map((flight) => (
            <Card key={flight.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {flight.airline} {flight.flight_number}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={STATUS_VARIANT[flight.status] ?? 'secondary'}>{flight.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(flight)} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <p className="font-medium">
                  {flight.departure_airport} → {flight.arrival_airport}
                </p>
                <p className="text-muted-foreground">
                  {formatFriendlyDateTime(flight.departure_at)} {flight.departure_at && `(${relativeToNow(flight.departure_at)})`}
                </p>
                {flight.arrival_at && <p className="text-muted-foreground">Arrives {formatFriendlyDateTime(flight.arrival_at)}</p>}
                {flight.booking_reference && (
                  <p>
                    <span className="text-muted-foreground">Ref:</span> {flight.booking_reference}
                  </p>
                )}
                {(flight.terminal || flight.gate) && (
                  <p>
                    <span className="text-muted-foreground">Terminal/Gate:</span> {flight.terminal || '—'} / {flight.gate || '—'}
                  </p>
                )}
                {flight.seats && (
                  <p>
                    <span className="text-muted-foreground">Seats:</span> {flight.seats}
                  </p>
                )}
                {flight.baggage_allowance && (
                  <p>
                    <span className="text-muted-foreground">Baggage:</span> {flight.baggage_allowance}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    setEditing(flight)
                    setFormOpen(true)
                  }}
                >
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FlightForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this flight?"
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) await flights.remove(deleting.id)
        }}
      />
    </div>
  )
}

function FlightForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'flights'> | null
  onSubmit: (values: FlightFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FlightFormInput, unknown, FlightFormValues>({ resolver: zodResolver(flightSchema) })

  useEffect(() => {
    if (open) {
      reset({
        airline: initial?.airline ?? '',
        flight_number: initial?.flight_number ?? '',
        departure_airport: initial?.departure_airport ?? '',
        arrival_airport: initial?.arrival_airport ?? '',
        departure_at: initial?.departure_at?.slice(0, 16) ?? '',
        arrival_at: initial?.arrival_at?.slice(0, 16) ?? '',
        booking_reference: initial?.booking_reference ?? '',
        seats: initial?.seats ?? '',
        baggage_allowance: initial?.baggage_allowance ?? '',
        terminal: initial?.terminal ?? '',
        gate: initial?.gate ?? '',
        status: initial?.status ?? 'scheduled',
        notes: initial?.notes ?? '',
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit flight' : 'Add flight'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="airline">Airline</Label>
              <Input id="airline" {...register('airline')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flight_number">Flight number</Label>
              <Input id="flight_number" {...register('flight_number')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="departure_airport">Departure airport</Label>
              <Input id="departure_airport" placeholder="e.g. DEL" {...register('departure_airport')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arrival_airport">Arrival airport</Label>
              <Input id="arrival_airport" placeholder="e.g. KEF" {...register('arrival_airport')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="departure_at">Departure (local)</Label>
              <Input id="departure_at" type="datetime-local" {...register('departure_at')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arrival_at">Arrival (local)</Label>
              <Input id="arrival_at" type="datetime-local" {...register('arrival_at')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking_reference">Booking reference</Label>
            <Input id="booking_reference" {...register('booking_reference')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="seats">Seats</Label>
              <Input id="seats" {...register('seats')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="baggage_allowance">Baggage allowance</Label>
              <Input id="baggage_allowance" {...register('baggage_allowance')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="terminal">Terminal</Label>
              <Input id="terminal" {...register('terminal')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gate">Gate</Label>
              <Input id="gate" {...register('gate')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FlightFormValues['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['scheduled', 'delayed', 'cancelled', 'completed'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
