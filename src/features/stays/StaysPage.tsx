import { zodResolver } from '@hookform/resolvers/zod'
import {
  IconBath,
  IconCalendarCheck,
  IconChefHat,
  IconClipboardText,
  IconCoffee,
  IconEgg,
  IconMap2,
  IconMapPinFilled,
  IconParkingCircle,
  IconPhone,
  IconPlus,
  IconToolsKitchen2,
  IconToolsKitchenOff,
  IconTrash,
} from '@tabler/icons-react'
import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { BookingImportButton } from '@/components/common/booking-import-dialog'
import { LocationLookup } from '@/components/common/location-lookup'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState, OfflineNotice } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import { googleMapsSearchUrl } from '@/lib/routing-adapter'
import type { Tables } from '@/types/database'
import type { ImportedAccommodation } from '@/lib/booking-import'
import { type AccommodationFormInput, type AccommodationFormValues, accommodationSchema } from '@/types/schemas'

const BATHROOM_LABELS = {
  private: 'Private bathroom',
  shared: 'Shared bathroom',
} as const
const COOKING_LABELS = {
  kitchen: 'Full kitchen',
  shared_kitchen: 'Shared kitchen',
  pantry: 'Pantry / kitchenette',
  none: 'No cooking facility',
} as const
const COOKING_ICONS = {
  kitchen: IconToolsKitchen2,
  shared_kitchen: IconChefHat,
  pantry: IconCoffee,
  none: IconToolsKitchenOff,
} as const

/** Formats a date/time pair the way the stay card and cancellation line both use: "10 OCT, Sun | 4:00 pm". */
function formatStayDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  return `${format(d, 'd')} ${format(d, 'MMM').toUpperCase()}, ${format(d, 'EEE')}`
}

function formatStayTime(time: string | null): string | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return format(new Date(2000, 0, 1, h, m), 'h:mm aaa')
}

function formatStayDateTime(dateIso: string | null, time: string | null): string {
  const datePart = formatStayDate(dateIso)
  if (!datePart) return '—'
  const timePart = formatStayTime(time)
  return timePart ? `${datePart} | ${timePart}` : datePart
}

/**
 * The cancellation deadline is entered via a plain `datetime-local` input
 * with no timezone (the traveler is assumed to be thinking in IST — see the
 * form label) — this must echo back exactly the digits that were typed, not
 * reinterpret the stored value as a UTC instant and shift it.
 */
function formatCancellationLine(iso: string | null): string | null {
  if (!iso) return null
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return null
  const [, y, mo, d, h, mi] = match
  return formatStayDateTime(`${y}-${mo}-${d}`, `${h}:${mi}`)
}

// Persists the in-progress Add/Edit stay form to sessionStorage so switching
// to another page and back (which unmounts and remounts StaysPage) restores
// exactly what was being typed, instead of silently discarding it. Cleared
// on an explicit close (save or cancel) — see the AccommodationForm effects.
const STAY_DRAFT_KEY = '2icy:stayFormDraft'

interface StayDraft {
  editingId: string | null
  values: AccommodationFormInput
}

function loadStayDraft(): StayDraft | null {
  try {
    const raw = sessionStorage.getItem(STAY_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as StayDraft) : null
  } catch {
    return null
  }
}

function saveStayDraft(draft: StayDraft) {
  try {
    sessionStorage.setItem(STAY_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Quota/serialization errors just mean the draft won't survive a navigation — not worth surfacing.
  }
}

function clearStayDraft() {
  try {
    sessionStorage.removeItem(STAY_DRAFT_KEY)
  } catch {
    // ignore
  }
}

export function StaysPage() {
  const { activeTripId } = useTrip()
  const stays = useRealtimeTable('accommodations', 'trip_id', activeTripId, {
    orderBy: 'check_in_date',
  })
  const days = useRealtimeTable('itinerary_days', 'trip_id', activeTripId, {
    orderBy: 'date',
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'accommodations'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'accommodations'> | null>(null)
  const hasRestoredDraftRef = useRef(false)
  const dayById = new Map(days.data.map((d) => [d.id, d]))

  // Restore an in-progress Add/Edit dialog left open before the page was
  // navigated away from — see STAY_DRAFT_KEY above.
  useEffect(() => {
    if (hasRestoredDraftRef.current || stays.loading) return
    hasRestoredDraftRef.current = true
    const draft = loadStayDraft()
    if (!draft) return
    if (draft.editingId) {
      const stay = stays.data.find((s) => s.id === draft.editingId)
      if (!stay) {
        clearStayDraft()
        return
      }
      setEditing(stay)
    } else {
      setEditing(null)
    }
    setFormOpen(true)
  }, [stays.loading, stays.data])

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
        contact_phone: values.contact_phone || null,
        website: values.website || null,
        booking_source: values.booking_source || null,
        notes: values.notes || null,
        itinerary_day_ids: values.itinerary_day_ids ?? [],
        town: values.town || null,
        bathroom_type: values.bathroom_type ?? null,
        cooking_facility: values.cooking_facility ?? null,
        has_parking: values.has_parking ?? null,
        breakfast_included: values.breakfast_included ?? null,
        cancellation_deadline: values.cancellation_deadline || null,
      }
      if (editing) await stays.update(editing.id, payload)
      else await stays.insert({ trip_id: activeTripId!, ...payload })
      setFormOpen(false)
    } catch (e) {
      toast({
        title: 'Could not save accommodation',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
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
              <IconPlus className="size-4" /> Add stay
            </Button>
          </div>
        }
      />
      {stays.isOffline && (
        <div className="mb-3">
          <OfflineNotice savedAt={stays.staleSince} />
        </div>
      )}
      {stays.data.length === 0 ? (
        <EmptyState title="No accommodation yet" description="Add your first booking to track it here." />
      ) : (
        <div className="space-y-3">
          {stays.data.map((stay) => (
            <StayCard
              key={stay.id}
              stay={stay}
              linkedDays={stay.itinerary_day_ids.map((id) => dayById.get(id)).filter((d): d is Tables<'itinerary_days'> => Boolean(d))}
              onEdit={() => {
                setEditing(stay)
                setFormOpen(true)
              }}
              onDelete={() => setDeleting(stay)}
            />
          ))}
        </div>
      )}

      <AccommodationForm open={formOpen} onOpenChange={setFormOpen} initial={editing} days={days.data} onSubmit={handleSubmit} />
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

function StayCard({
  stay,
  linkedDays,
  onEdit,
  onDelete,
}: {
  stay: Tables<'accommodations'>
  linkedDays: Tables<'itinerary_days'>[]
  onEdit: () => void
  onDelete: () => void
}) {
  const CookingIcon = stay.cooking_facility ? COOKING_ICONS[stay.cooking_facility] : null
  const checkInDate = stay.check_in_date ? new Date(`${stay.check_in_date}T00:00:00`) : null
  const cancellationLine = formatCancellationLine(stay.cancellation_deadline)

  // The date panel shows a range spanning every linked itinerary day (e.g. a
  // 2-night stay linked to both nights) rather than just the check-in date,
  // falling back to check-in when no days are linked yet.
  const sortedLinkedDays = [...linkedDays].sort((a, b) => a.date.localeCompare(b.date))
  const rangeStart = sortedLinkedDays[0] ? new Date(`${sortedLinkedDays[0].date}T00:00:00`) : checkInDate
  const rangeEnd = sortedLinkedDays.length > 1 ? new Date(`${sortedLinkedDays[sortedLinkedDays.length - 1].date}T00:00:00`) : null
  const actionPillClass =
    'flex items-center gap-1 rounded-sm bg-[var(--color-secondary-tint)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-secondary)]'
  const amenityPillClass = 'flex items-center gap-1 rounded-sm bg-muted px-2.5 py-1 text-[10px] font-semibold text-foreground'
  const amenityIconClass = 'size-3.5 shrink-0 text-primary'

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-2.5">
          <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-[var(--color-primary-tint)] py-2">
            {rangeStart ? (
              <>
                <span className="text-2xl font-extrabold leading-none">{format(rangeStart, 'd')}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{format(rangeStart, 'MMM')}</span>
                {rangeEnd && (
                  <>
                    <span className="text-sm font-bold leading-none text-muted-foreground">-</span>
                    <span className="text-2xl font-extrabold leading-none">{format(rangeEnd, 'd')}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{format(rangeEnd, 'MMM')}</span>
                  </>
                )}
              </>
            ) : (
              <IconCalendarCheck className="size-5 text-muted-foreground" />
            )}
          </div>

          <div className="relative min-w-0 flex-1 space-y-1.5">
            <Button variant="ghost" size="icon" className="absolute right-0 top-0 size-7 shrink-0" onClick={onDelete} aria-label="Delete">
              <IconTrash className="size-4" />
            </Button>

            <div className="flex flex-wrap items-center gap-1.5 pr-8">
              <h3
                className="cursor-pointer text-base font-bold leading-none text-primary hover:underline"
                onClick={onEdit}
                title="Edit stay"
              >
                {stay.name}
              </h3>
              {stay.town && (
                <span className={amenityPillClass}>
                  <IconMapPinFilled className={amenityIconClass} /> {stay.town}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-0.5">
              <div>
                <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">Check-in</p>
                <p className="text-sm font-bold leading-tight">{formatStayDateTime(stay.check_in_date, stay.check_in_time)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">Check-out</p>
                <p className="text-sm font-bold leading-tight">{formatStayDateTime(stay.check_out_date, stay.check_out_time)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {stay.bathroom_type && (
                <span className={amenityPillClass}>
                  <IconBath className={amenityIconClass} /> {BATHROOM_LABELS[stay.bathroom_type]}
                </span>
              )}
              {stay.cooking_facility && (
                <span className={amenityPillClass}>
                  {CookingIcon && <CookingIcon className={amenityIconClass} />} {COOKING_LABELS[stay.cooking_facility]}
                </span>
              )}
              {stay.has_parking && (
                <span className={amenityPillClass}>
                  <IconParkingCircle className={amenityIconClass} /> Free parking
                </span>
              )}
              {stay.breakfast_included && (
                <span className={amenityPillClass}>
                  <IconEgg className={amenityIconClass} /> Breakfast included
                </span>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {stay.contact_phone && (
                  <a href={`tel:${stay.contact_phone}`} className={actionPillClass}>
                    <IconPhone className="size-3" /> {stay.contact_phone}
                  </a>
                )}
                <a href={googleMapsSearchUrl(stay.address || stay.name)} target="_blank" rel="noreferrer" className={actionPillClass}>
                  <IconMap2 className="size-3" /> Open in Maps
                </a>
                {stay.website && (
                  <a href={stay.website} target="_blank" rel="noreferrer" className={actionPillClass}>
                    <IconClipboardText className="size-3" /> Booking details
                  </a>
                )}
              </div>
            </div>

            {cancellationLine && (
              <p className="border-t border-border pt-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Free cancellation until </span>
                <span className="text-[10px] font-bold">{cancellationLine}</span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AccommodationForm({
  open,
  onOpenChange,
  initial,
  days,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'accommodations'> | null
  days: Tables<'itinerary_days'>[]
  onSubmit: (values: AccommodationFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccommodationFormInput, unknown, AccommodationFormValues>({
    resolver: zodResolver(accommodationSchema),
  })

  const wasOpenRef = useRef(open)

  // Restore a matching in-progress draft (see STAY_DRAFT_KEY) instead of the
  // saved record whenever this dialog opens for the same target.
  useEffect(() => {
    if (!open) return
    const draft = loadStayDraft()
    if (draft && draft.editingId === (initial?.id ?? null)) {
      reset(draft.values)
      return
    }
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
      contact_phone: initial?.contact_phone ?? '',
      website: initial?.website ?? '',
      booking_source: initial?.booking_source ?? '',
      notes: initial?.notes ?? '',
      itinerary_day_ids: initial?.itinerary_day_ids ?? [],
      town: initial?.town ?? '',
      bathroom_type: initial?.bathroom_type ?? undefined,
      cooking_facility: initial?.cooking_facility ?? undefined,
      has_parking: initial?.has_parking ?? false,
      breakfast_included: initial?.breakfast_included ?? false,
      cancellation_deadline: initial?.cancellation_deadline?.slice(0, 16) ?? '',
    })
  }, [open, initial, reset])

  // Persist every change while the dialog is open so navigating away and
  // back (which unmounts/remounts the whole page) doesn't lose it.
  useEffect(() => {
    if (!open) return
    const subscription = watch((values) => {
      saveStayDraft({ editingId: initial?.id ?? null, values: values as AccommodationFormInput })
    })
    return () => subscription.unsubscribe()
  }, [open, initial, watch])

  // Only an explicit close (save or cancel) should discard the draft — not
  // an unmount, which fires no effect body at all, only cleanups.
  useEffect(() => {
    if (wasOpenRef.current && !open) clearStayDraft()
    wasOpenRef.current = open
  }, [open])

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
          <div className="space-y-3">
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
              <Label>Linked itinerary day(s)</Label>
              {days.length === 0 ? (
                <p className="text-xs text-muted-foreground">No itinerary days yet.</p>
              ) : (
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                  {days.map((d) => {
                    const selected = watch('itinerary_day_ids') ?? []
                    const checked = selected.includes(d.id)
                    return (
                      <label key={d.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={checked}
                          onChange={(e) =>
                            setValue('itinerary_day_ids', e.target.checked ? [...selected, d.id] : selected.filter((id) => id !== d.id))
                          }
                        />
                        {format(new Date(`${d.date}T00:00:00`), 'EEE d MMM')} — {d.title || d.overnight_location || 'Untitled'}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="town">Town</Label>
              <Input id="town" placeholder="e.g. Vik" {...register('town')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
              <LocationLookup
                query={watch('address') || watch('name') || ''}
                onSelect={(result) => {
                  setValue('address', result.address)
                  setValue('lat', result.lat)
                  setValue('lng', result.lng)
                  if (result.town && !watch('town')) setValue('town', result.town)
                }}
              />
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
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bathroom</Label>
                <Select
                  value={watch('bathroom_type') ?? 'unset'}
                  onValueChange={(v) => setValue('bathroom_type', v === 'unset' ? undefined : (v as 'private' | 'shared'))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not specified</SelectItem>
                    <SelectItem value="private">Private bathroom</SelectItem>
                    <SelectItem value="shared">Shared bathroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cooking facility</Label>
                <Select
                  value={watch('cooking_facility') ?? 'unset'}
                  onValueChange={(v) =>
                    setValue('cooking_facility', v === 'unset' ? undefined : (v as 'kitchen' | 'shared_kitchen' | 'pantry' | 'none'))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not specified</SelectItem>
                    <SelectItem value="kitchen">Full kitchen</SelectItem>
                    <SelectItem value="shared_kitchen">Shared kitchen</SelectItem>
                    <SelectItem value="pantry">Pantry / kitchenette</SelectItem>
                    <SelectItem value="none">No cooking facility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={watch('has_parking') ?? false}
                  onChange={(e) => setValue('has_parking', e.target.checked)}
                />
                Parking available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={watch('breakfast_included') ?? false}
                  onChange={(e) => setValue('breakfast_included', e.target.checked)}
                />
                Breakfast included
              </label>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="confirmation_number">Confirmation number</Label>
              <Input id="confirmation_number" {...register('confirmation_number')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Contact phone</Label>
                <Input id="contact_phone" {...register('contact_phone')} />
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
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
            <Label htmlFor="cancellation_deadline">Free cancellation until (IST)</Label>
            <Input id="cancellation_deadline" type="datetime-local" {...register('cancellation_deadline')} />
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
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
