import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTrip } from '@/context/trip-context'
import { type TripFormValues, tripSchema } from '@/types/schemas'

export function OnboardingPage() {
  const { createTrip } = useTrip()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: { name: 'Iceland Ring Road', startDate: '2026-10-09', endDate: '2026-10-23' },
  })

  const onSubmit = async (values: TripFormValues) => {
    setError(null)
    try {
      await createTrip({ name: values.name, startDate: values.startDate || undefined, endDate: values.endDate || undefined })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create trip')
    }
  }

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set up your trip</CardTitle>
          <CardDescription>
            Create your shared trip, then invite your partner from Settings so you can both view and edit it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Trip name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" type="date" {...register('startDate')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" type="date" {...register('endDate')} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create trip'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
