import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink, Phone, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { BookingImportButton } from '@/components/common/booking-import-dialog'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState, OfflineNotice } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import { formatFriendlyDate } from '@/lib/dates'
import { googleMapsSearchUrl } from '@/lib/routing-adapter'
import type { Tables } from '@/types/database'
import type { ImportedAccommodation } from '@/lib/booking-import'
import { type AccommodationFormInput, type AccommodationFormValues, accommodationSchema } from '@/types/schemas'

export function StaysPage() {
  const { activeTripId } = useTrip()
  const stays = useRealtimeTable('accommodations', 'trip_id', activeTripId, { orderBy: 'check_in_date' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'accommodations'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'accommodations'> | null>(null)

  const handleSubmit = async (values: AccommodationFormValues) => {
    try {
      const payload = {
        name: values.name,
        check_in_date: values.check_in_date || null,
        check_out_date: values.check_out_date || null,
        check_in_time: values.check_in_time || null,
        check_out_time: values.check_out_time || null,
        address: values.address || null,
        lat: values.lat ?? null,
        lng: values.lng ?? null,
        confirmation_number: values.confirmation_number || null,
        contact_name: values.contact_name || null,
        contact_phone: values.contact_phone || null,
        contact_email: values.contact_email || null,
        website: values.website || null,
        booking_source: values.booking_source || null,
        parking_notes: values.parking_notes || null,
        cancellation_policy: values.cancellation_policy || null,
        notes: values.notes || null,
      }
      if (editing) await stays.update(editing.id, payload)
      else await stays.insert({ trip_id: activeTripId!, ...payload })
      setFormOpen(false)
    } catch (e) {
      toast({ title: 'Could not save accommodation', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  if (stays.loading) return <LoadingState label="Loading stays…" />
  if (stays.error) return <ErrorState message={stays.error} onRetry={stays.refresh} />

  return (
    <div>
      <PageHeader
        title="Stays"
        description="Accommodation bookings for the trip."
        action={
          <div className="flex gap-2">
            <BookingImportButton
              kind="accommodation"
              onImport={async (bookings) => {
                for (const booking of bookings) {
                  const { kind: _kind, ...stay } = booking as ImportedAccommodation
                  void _kind
                  await stays.insert({ trip_id: activeTripId!, ...stay })
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
              <Plus className="size-4" /> Add stay
            </Button>
          </div>
        }
      />
      {stays.isOffline && <div className="mb-3"><OfflineNotice savedAt={stays.staleSince} /></div>}
      {stays.data.length === 0 ? (
        <EmptyState title="No accommodation yet" description="Add your first booking to track it here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stays.data.map((stay) => (
            <Card key={stay.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{stay.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(stay)} aria-label="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFriendlyDate(stay.check_in_date)} {stay.check_in_time && `· ${stay.check_in_time}`} → {formatFriendlyDate(stay.check_out_date)}{' '}
                  {stay.check_out_time && `· ${stay.check_out_time}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {stay.address && <p className="text-muted-foreground">{stay.address}</p>}
                {stay.confirmation_number && (
                  <p>
                    <span className="text-muted-foreground">Confirmation:</span> {stay.confirmation_number}
                  </p>
                )}
                {stay.parking_notes && (
                  <p>
                    <span className="text-muted-foreground">Parking:</span> {stay.parking_notes}
                  </p>
                )}
                {stay.cancellation_policy && (
                  <p>
                    <span className="text-muted-foreground">Cancellation:</span> {stay.cancellation_policy}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-1 text-xs">
                  <a href={googleMapsSearchUrl(stay.address || stay.name)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Open in Maps
                  </a>
                  {stay.contact_phone && (
                    <a href={`tel:${stay.contact_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                      <Phone className="size-3" /> {stay.contact_phone}
                    </a>
                  )}
                  {stay.website && (
                    <a href={stay.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="size-3" /> Website
                    </a>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    setEditing(stay)
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

      <AccommodationForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this accommodation?"
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) await stays.remove(deleting.id)
        }}
      />
    </div>
  )
}

function AccommodationForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'accommodations'> | null
  onSubmit: (values: AccommodationFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccommodationFormInput, unknown, AccommodationFormValues>({ resolver: zodResolver(accommodationSchema) })

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        check_in_date: initial?.check_in_date ?? '',
        check_out_date: initial?.check_out_date ?? '',
        check_in_time: initial?.check_in_time ?? '',
        check_out_time: initial?.check_out_time ?? '',
        address: initial?.address ?? '',
        lat: initial?.lat ?? undefined,
        lng: initial?.lng ?? undefined,
        confirmation_number: initial?.confirmation_number ?? '',
        contact_name: initial?.contact_name ?? '',
        contact_phone: initial?.contact_phone ?? '',
        contact_email: initial?.contact_email ?? '',
        website: initial?.website ?? '',
        booking_source: initial?.booking_source ?? '',
        parking_notes: initial?.parking_notes ?? '',
        cancellation_policy: initial?.cancellation_policy ?? '',
        notes: initial?.notes ?? '',
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit stay' : 'Add stay'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(async (v) => {
            await onSubmit(v)
          })}
          className="space-y-3"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Property name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="check_in_date">Check-in date</Label>
              <Input id="check_in_date" type="date" {...register('check_in_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="check_out_date">Check-out date</Label>
              <Input id="check_out_date" type="date" {...register('check_out_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="check_in_time">Check-in time</Label>
              <Input id="check_in_time" type="time" {...register('check_in_time')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="check_out_time">Check-out time</Label>
              <Input id="check_out_time" type="time" {...register('check_out_time')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" type="number" step="any" {...register('lat')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" type="number" step="any" {...register('lng')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmation_number">Confirmation number</Label>
            <Input id="confirmation_number" {...register('confirmation_number')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contact name</Label>
              <Input id="contact_name" {...register('contact_name')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">Contact phone</Label>
              <Input id="contact_phone" {...register('contact_phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">Contact email</Label>
              <Input id="contact_email" type="email" {...register('contact_email')} />
              {errors.contact_email && <p className="text-sm text-destructive">Invalid email</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website / booking link</Label>
              <Input id="website" {...register('website')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking_source">Booking source</Label>
            <Input id="booking_source" placeholder="e.g. Booking.com" {...register('booking_source')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parking_notes">Parking notes</Label>
            <Textarea id="parking_notes" rows={2} {...register('parking_notes')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cancellation_policy">Cancellation policy</Label>
            <Textarea id="cancellation_policy" rows={2} {...register('cancellation_policy')} />
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
