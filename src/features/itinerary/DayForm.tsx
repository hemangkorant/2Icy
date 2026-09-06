import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Tables } from '@/types/database'
import { type ItineraryDayFormInput, type ItineraryDayFormValues, itineraryDaySchema } from '@/types/schemas'

export function DayForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'itinerary_days'> | null
  onSubmit: (values: ItineraryDayFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItineraryDayFormInput, unknown, ItineraryDayFormValues>({ resolver: zodResolver(itineraryDaySchema) })

  useEffect(() => {
    if (open) {
      reset({
        date: initial?.date ?? '',
        title: initial?.title ?? '',
        overnight_location: initial?.overnight_location ?? '',
        overnight_lat: initial?.overnight_lat ?? undefined,
        overnight_lng: initial?.overnight_lng ?? undefined,
        notes: initial?.notes ?? '',
      })
    }
  }, [open, initial, reset])

  const submit = async (values: ItineraryDayFormValues) => {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit day' : 'Add day'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. South Coast waterfalls" {...register('title')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="overnight_location">Overnight location</Label>
            <Input id="overnight_location" placeholder="e.g. Vik" {...register('overnight_location')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="overnight_lat">Overnight latitude</Label>
              <Input id="overnight_lat" type="number" step="any" {...register('overnight_lat')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overnight_lng">Overnight longitude</Label>
              <Input id="overnight_lng" type="number" step="any" {...register('overnight_lng')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
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
