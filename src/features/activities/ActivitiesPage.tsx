import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink, Plus, Ticket, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState, OfflineNotice } from '@/components/common/states'
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
import { formatFriendlyDate } from '@/lib/dates'
import { googleMapsSearchUrl } from '@/lib/routing-adapter'
import type { Tables } from '@/types/database'
import { type ActivityFormInput, type ActivityFormValues, activitySchema } from '@/types/schemas'

const REMINDER_VARIANT: Record<string, 'secondary' | 'success' | 'default'> = {
  pending: 'secondary',
  confirmed: 'default',
  checked_in: 'success',
}

export function ActivitiesPage() {
  const { activeTripId } = useTrip()
  const activities = useRealtimeTable('activities', 'trip_id', activeTripId, { orderBy: 'activity_date' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'activities'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'activities'> | null>(null)

  if (activities.loading) return <LoadingState label="Loading activities…" />
  if (activities.error) return <ErrorState message={activities.error} onRetry={activities.refresh} />

  const handleSubmit = async (values: ActivityFormValues) => {
    try {
      const payload = {
        name: values.name,
        provider: values.provider || null,
        activity_date: values.activity_date || null,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        duration_minutes: values.duration_minutes ?? null,
        meeting_point: values.meeting_point || null,
        lat: values.lat ?? null,
        lng: values.lng ?? null,
        booking_reference: values.booking_reference || null,
        price: values.price ?? null,
        currency: values.currency,
        participants: values.participants || null,
        what_to_bring: values.what_to_bring || null,
        cancellation_policy: values.cancellation_policy || null,
        contact_details: values.contact_details || null,
        booking_link: values.booking_link || null,
        reminder_status: values.reminder_status,
        notes: values.notes || null,
      }
      if (editing) await activities.update(editing.id, payload)
      else await activities.insert({ trip_id: activeTripId!, ...payload })
      setFormOpen(false)
    } catch (e) {
      toast({ title: 'Could not save activity', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Activities"
        description="Booked tours and experiences."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" /> Add activity
          </Button>
        }
      />
      {activities.isOffline && <div className="mb-3"><OfflineNotice savedAt={activities.staleSince} /></div>}
      {activities.data.length === 0 ? (
        <EmptyState icon={<Ticket className="size-8" />} title="No activities yet" description="Add booked tours to track times and cancellation policies." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activities.data.map((activity) => (
            <Card key={activity.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{activity.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={REMINDER_VARIANT[activity.reminder_status]}>{activity.reminder_status.replace('_', ' ')}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(activity)} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFriendlyDate(activity.activity_date)} {activity.start_time && `· ${activity.start_time}`}
                  {activity.end_time && `–${activity.end_time}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {activity.provider && <p className="text-muted-foreground">{activity.provider}</p>}
                {activity.meeting_point && (
                  <p>
                    <span className="text-muted-foreground">Meet:</span> {activity.meeting_point}{' '}
                    <a href={googleMapsSearchUrl(activity.meeting_point)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      (Map)
                    </a>
                  </p>
                )}
                {activity.price != null && (
                  <p>
                    <span className="text-muted-foreground">Price:</span> {activity.price} {activity.currency}
                  </p>
                )}
                {activity.booking_reference && (
                  <p>
                    <span className="text-muted-foreground">Ref:</span> {activity.booking_reference}
                  </p>
                )}
                {activity.what_to_bring && (
                  <p>
                    <span className="text-muted-foreground">Bring:</span> {activity.what_to_bring}
                  </p>
                )}
                {activity.cancellation_policy && (
                  <p>
                    <span className="text-muted-foreground">Cancellation:</span> {activity.cancellation_policy}
                  </p>
                )}
                {activity.booking_link && (
                  <a href={activity.booking_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="size-3" /> Booking link
                  </a>
                )}
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => { setEditing(activity); setFormOpen(true) }}>
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ActivityForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this activity?"
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) await activities.remove(deleting.id)
        }}
      />
    </div>
  )
}

function ActivityForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'activities'> | null
  onSubmit: (values: ActivityFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormInput, unknown, ActivityFormValues>({ resolver: zodResolver(activitySchema) })

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        provider: initial?.provider ?? '',
        activity_date: initial?.activity_date ?? '',
        start_time: initial?.start_time ?? '',
        end_time: initial?.end_time ?? '',
        duration_minutes: initial?.duration_minutes ?? undefined,
        meeting_point: initial?.meeting_point ?? '',
        lat: initial?.lat ?? undefined,
        lng: initial?.lng ?? undefined,
        booking_reference: initial?.booking_reference ?? '',
        price: initial?.price ?? undefined,
        currency: initial?.currency ?? 'ISK',
        participants: initial?.participants ?? '',
        what_to_bring: initial?.what_to_bring ?? '',
        cancellation_policy: initial?.cancellation_policy ?? '',
        contact_details: initial?.contact_details ?? '',
        booking_link: initial?.booking_link ?? '',
        reminder_status: initial?.reminder_status ?? 'pending',
        notes: initial?.notes ?? '',
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit activity' : 'Add activity'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provider">Provider</Label>
            <Input id="provider" {...register('provider')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="activity_date">Date</Label>
              <Input id="activity_date" type="date" {...register('activity_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Start</Label>
              <Input id="start_time" type="time" {...register('start_time')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">End</Label>
              <Input id="end_time" type="time" {...register('end_time')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meeting_point">Meeting point</Label>
            <Input id="meeting_point" {...register('meeting_point')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="any" {...register('price')} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['ISK', 'INR', 'EUR', 'GBP', 'USD'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking_reference">Booking reference</Label>
            <Input id="booking_reference" {...register('booking_reference')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking_link">Booking link</Label>
            <Input id="booking_link" {...register('booking_link')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="what_to_bring">What to bring</Label>
            <Textarea id="what_to_bring" rows={2} {...register('what_to_bring')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cancellation_policy">Cancellation policy</Label>
            <Textarea id="cancellation_policy" rows={2} {...register('cancellation_policy')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_details">Contact details</Label>
            <Input id="contact_details" {...register('contact_details')} />
          </div>
          <div className="space-y-1.5">
            <Label>Reminder status</Label>
            <Select value={watch('reminder_status')} onValueChange={(v) => setValue('reminder_status', v as ActivityFormValues['reminder_status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['pending', 'confirmed', 'checked_in'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace('_', ' ')}
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
