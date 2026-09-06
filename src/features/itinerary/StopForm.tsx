import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Tables } from '@/types/database'
import { type ItineraryStopFormInput, type ItineraryStopFormValues, itineraryStopSchema } from '@/types/schemas'

const STATUS_OPTIONS = ['planned', 'confirmed', 'done', 'skipped']

export function StopForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'itinerary_stops'> | null
  onSubmit: (values: ItineraryStopFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItineraryStopFormInput, unknown, ItineraryStopFormValues>({ resolver: zodResolver(itineraryStopSchema) })

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        address: initial?.address ?? '',
        lat: initial?.lat ?? undefined,
        lng: initial?.lng ?? undefined,
        planned_arrival: initial?.planned_arrival ?? '',
        planned_departure: initial?.planned_departure ?? '',
        activity_notes: initial?.activity_notes ?? '',
        booking_link: initial?.booking_link ?? '',
        status: initial?.status ?? 'planned',
      })
    }
  }, [open, initial, reset])

  const submit = async (values: ItineraryStopFormValues) => {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit stop' : 'Add stop'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Seljalandsfoss" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="planned_arrival">Planned arrival</Label>
              <Input id="planned_arrival" type="time" {...register('planned_arrival')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="planned_departure">Planned departure</Label>
              <Input id="planned_departure" type="time" {...register('planned_departure')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking_link">Booking link</Label>
            <Input id="booking_link" placeholder="https://…" {...register('booking_link')} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={watch('status')} onValueChange={(v) => setValue('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity_notes">Notes</Label>
            <Textarea id="activity_notes" rows={3} {...register('activity_notes')} />
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
