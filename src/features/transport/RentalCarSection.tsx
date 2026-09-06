import { zodResolver } from '@hookform/resolvers/zod'
import { Car, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { BookingImportButton } from '@/components/common/booking-import-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import { formatFriendlyDateTime } from '@/lib/dates'
import type { ImportedRentalCar } from '@/lib/booking-import'
import { supabase } from '@/lib/supabase'
import type { ChecklistStage, Tables } from '@/types/database'
import { type RentalCarFormInput, type RentalCarFormValues, rentalCarSchema } from '@/types/schemas'

import { DEFAULT_CHECKLIST_ITEMS } from './checklist-defaults'
import { VehicleChecklist } from './VehicleChecklist'

const STAGES: ChecklistStage[] = ['before_pickup', 'during_trip', 'before_return']

export function RentalCarSection() {
  const { activeTripId } = useTrip()
  const cars = useRealtimeTable('rental_cars', 'trip_id', activeTripId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'rental_cars'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'rental_cars'> | null>(null)

  if (cars.loading) return <LoadingState label="Loading rental car…" />
  if (cars.error) return <ErrorState message={cars.error} onRetry={cars.refresh} />

  const seedChecklist = async (rentalCarId: string) => {
    const rows = STAGES.flatMap((stage) =>
      DEFAULT_CHECKLIST_ITEMS[stage].map((label, position) => ({ rental_car_id: rentalCarId, stage, label, position })),
    )
    await supabase.from('vehicle_checklists').insert(rows)
  }

  const handleSubmit = async (values: RentalCarFormValues) => {
    try {
      const payload = {
        rental_company: values.rental_company || null,
        car_model: values.car_model || null,
        registration_number: values.registration_number || null,
        pickup_location: values.pickup_location || null,
        pickup_address: values.pickup_address || null,
        pickup_at: values.pickup_at || null,
        dropoff_location: values.dropoff_location || null,
        dropoff_address: values.dropoff_address || null,
        dropoff_at: values.dropoff_at || null,
        confirmation_number: values.confirmation_number || null,
        fuel_type: values.fuel_type ?? null,
        insurance_level: values.insurance_level || null,
        insurance_exclusions: values.insurance_exclusions || null,
        emergency_contact: values.emergency_contact || null,
        mileage_pickup: values.mileage_pickup ?? null,
        mileage_return: values.mileage_return ?? null,
        return_instructions: values.return_instructions || null,
        notes: values.notes || null,
      }
      if (editing) {
        await cars.update(editing.id, payload)
      } else {
        const created = await cars.insert({ trip_id: activeTripId!, ...payload })
        await seedChecklist(created.id)
      }
      setFormOpen(false)
    } catch (e) {
      toast({ title: 'Could not save rental car', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <BookingImportButton
            kind="rental_car"
            onImport={async (bookings) => {
              const booking = bookings[0] as ImportedRentalCar
              const { kind: _kind, ...rentalCar } = booking
              void _kind
              const created = await cars.insert({ trip_id: activeTripId!, ...rentalCar })
              await seedChecklist(created.id)
            }}
          />
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" /> Add rental car
        </Button>
        </div>
      </div>

      {cars.data.length === 0 ? (
        <EmptyState icon={<Car className="size-8" />} title="No rental car yet" description="Add your rental to get pickup/return checklists." />
      ) : (
        cars.data.map((car) => (
          <Card key={car.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {car.car_model || 'Rental car'} {car.registration_number && `· ${car.registration_number}`}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(car); setFormOpen(true) }}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(car)} aria-label="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{car.rental_company}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Pickup:</span> {car.pickup_location || '—'}{' '}
                  {car.pickup_at && `· ${formatFriendlyDateTime(car.pickup_at)}`}
                </p>
                <p>
                  <span className="text-muted-foreground">Drop-off:</span> {car.dropoff_location || '—'}{' '}
                  {car.dropoff_at && `· ${formatFriendlyDateTime(car.dropoff_at)}`}
                </p>
                <p>
                  <span className="text-muted-foreground">Fuel:</span> {car.fuel_type ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Insurance:</span> {car.insurance_level || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Confirmation:</span> {car.confirmation_number || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Emergency contact:</span> {car.emergency_contact || '—'}
                </p>
              </div>
              {car.insurance_exclusions && (
                <p className="rounded-md bg-warning/10 p-2 text-xs">
                  <span className="font-medium">Exclusions:</span> {car.insurance_exclusions}
                </p>
              )}
              {car.return_instructions && (
                <p>
                  <span className="text-muted-foreground">Return instructions:</span> {car.return_instructions}
                </p>
              )}

              <Tabs defaultValue="before_pickup">
                <TabsList>
                  <TabsTrigger value="before_pickup">Before pickup</TabsTrigger>
                  <TabsTrigger value="during_trip">During trip</TabsTrigger>
                  <TabsTrigger value="before_return">Before return</TabsTrigger>
                </TabsList>
                {STAGES.map((stage) => (
                  <TabsContent key={stage} value={stage}>
                    <VehicleChecklist rentalCarId={car.id} stage={stage} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        ))
      )}

      <RentalCarForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this rental car?"
        description="This also removes its checklists and unlinks any fuel entries."
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) await cars.remove(deleting.id)
        }}
      />
    </div>
  )
}

function RentalCarForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'rental_cars'> | null
  onSubmit: (values: RentalCarFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<RentalCarFormInput, unknown, RentalCarFormValues>({ resolver: zodResolver(rentalCarSchema) })

  useEffect(() => {
    if (open) {
      reset({
        rental_company: initial?.rental_company ?? '',
        car_model: initial?.car_model ?? '',
        registration_number: initial?.registration_number ?? '',
        pickup_location: initial?.pickup_location ?? '',
        pickup_address: initial?.pickup_address ?? '',
        pickup_at: initial?.pickup_at?.slice(0, 16) ?? '',
        dropoff_location: initial?.dropoff_location ?? '',
        dropoff_address: initial?.dropoff_address ?? '',
        dropoff_at: initial?.dropoff_at?.slice(0, 16) ?? '',
        confirmation_number: initial?.confirmation_number ?? '',
        fuel_type: initial?.fuel_type ?? undefined,
        insurance_level: initial?.insurance_level ?? '',
        insurance_exclusions: initial?.insurance_exclusions ?? '',
        emergency_contact: initial?.emergency_contact ?? '',
        mileage_pickup: initial?.mileage_pickup ?? undefined,
        mileage_return: initial?.mileage_return ?? undefined,
        return_instructions: initial?.return_instructions ?? '',
        notes: initial?.notes ?? '',
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit rental car' : 'Add rental car'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rental_company">Rental company</Label>
              <Input id="rental_company" {...register('rental_company')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="car_model">Car model / category</Label>
              <Input id="car_model" {...register('car_model')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="registration_number">Registration number</Label>
              <Input id="registration_number" {...register('registration_number')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmation_number">Confirmation number</Label>
              <Input id="confirmation_number" {...register('confirmation_number')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pickup_location">Pickup location</Label>
              <Input id="pickup_location" {...register('pickup_location')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pickup_at">Pickup date/time</Label>
              <Input id="pickup_at" type="datetime-local" {...register('pickup_at')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pickup_address">Pickup address</Label>
            <Input id="pickup_address" {...register('pickup_address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dropoff_location">Drop-off location</Label>
              <Input id="dropoff_location" {...register('dropoff_location')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dropoff_at">Drop-off date/time</Label>
              <Input id="dropoff_at" type="datetime-local" {...register('dropoff_at')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dropoff_address">Drop-off address</Label>
            <Input id="dropoff_address" {...register('dropoff_address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fuel type</Label>
              <Select value={watch('fuel_type')} onValueChange={(v) => setValue('fuel_type', v as RentalCarFormValues['fuel_type'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {['petrol', 'diesel', 'electric', 'hybrid'].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insurance_level">Insurance level</Label>
              <Input id="insurance_level" {...register('insurance_level')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="insurance_exclusions">Insurance exclusions</Label>
            <Textarea id="insurance_exclusions" rows={2} {...register('insurance_exclusions')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact">Emergency / roadside contact</Label>
            <Input id="emergency_contact" {...register('emergency_contact')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mileage_pickup">Mileage at pickup</Label>
              <Input id="mileage_pickup" type="number" {...register('mileage_pickup')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mileage_return">Mileage at return</Label>
              <Input id="mileage_return" type="number" {...register('mileage_return')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="return_instructions">Return instructions</Label>
            <Textarea id="return_instructions" rows={2} {...register('return_instructions')} />
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
