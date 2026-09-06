import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { useTrip } from '@/context/trip-context'
import { toast } from '@/hooks/use-toast'
import { CURRENCIES, DEFAULT_RATES, type ExchangeRates } from '@/lib/currency'
import { supabase } from '@/lib/supabase'
import type { CurrencyCode } from '@/types/database'

const inviteSchema = z.object({ email: z.string().email('Enter a valid email') })

export function SettingsPage() {
  const { activeTrip, activeTripId, members, inviteMember, refresh } = useTrip()
  const { profile } = useAuth()
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES)
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null)
  const [tripName, setTripName] = useState(activeTrip?.name ?? '')
  const [startDate, setStartDate] = useState(activeTrip?.start_date ?? '')
  const [endDate, setEndDate] = useState(activeTrip?.end_date ?? '')

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    reset: resetInvite,
    formState: { errors: inviteErrors, isSubmitting: invitingSubmitting },
  } = useForm<z.infer<typeof inviteSchema>>({ resolver: zodResolver(inviteSchema) })

  useEffect(() => {
    setTripName(activeTrip?.name ?? '')
    setStartDate(activeTrip?.start_date ?? '')
    setEndDate(activeTrip?.end_date ?? '')
  }, [activeTrip])

  useEffect(() => {
    if (!activeTripId) return
    supabase
      .from('app_settings')
      .select('exchange_rates, exchange_rates_updated_at')
      .eq('trip_id', activeTripId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.exchange_rates) setRates(data.exchange_rates as ExchangeRates)
        setRatesUpdatedAt(data?.exchange_rates_updated_at ?? null)
      })
  }, [activeTripId])

  const saveTripDetails = async () => {
    if (!activeTripId) return
    const { error } = await supabase.from('trips').update({ name: tripName, start_date: startDate || null, end_date: endDate || null }).eq('id', activeTripId)
    if (error) toast({ title: 'Could not save trip details', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Trip details saved' })
      await refresh()
    }
  }

  const saveRates = async () => {
    if (!activeTripId) return
    const { error } = await supabase
      .from('app_settings')
      .update({ exchange_rates: rates, exchange_rates_updated_at: new Date().toISOString() })
      .eq('trip_id', activeTripId)
    if (error) toast({ title: 'Could not save exchange rates', description: error.message, variant: 'destructive' })
    else {
      setRatesUpdatedAt(new Date().toISOString())
      toast({ title: 'Exchange rates saved' })
    }
  }

  const handleInvite = async (values: z.infer<typeof inviteSchema>) => {
    try {
      await inviteMember(values.email)
      resetInvite()
      toast({ title: 'Invitation added', description: `${values.email} can join once they sign in with this email.` })
    } catch (e) {
      toast({ title: 'Could not invite', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Trip details, sharing, and exchange rates." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trip details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tripName">Trip name</Label>
            <Input id="tripName" value={tripName} onChange={(e) => setTripName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Timezone: {activeTrip?.timezone}</p>
          <Button size="sm" onClick={saveTripDetails}>
            Save trip details
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trip members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{m.user_id === profile?.id ? `${profile.full_name ?? profile.email} (you)` : m.invited_email ?? m.user_id}</span>
                <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>{m.role}</Badge>
              </div>
            ))}
          </div>
          <form onSubmit={handleInviteSubmit(handleInvite)} className="flex gap-2" noValidate>
            <Input placeholder="partner@example.com" {...registerInvite('email')} />
            <Button type="submit" disabled={invitingSubmitting}>
              <Mail className="size-4" /> Invite
            </Button>
          </form>
          {inviteErrors.email && <p className="text-sm text-destructive">{inviteErrors.email.message}</p>}
          <p className="text-xs text-muted-foreground">
            Your partner signs in with this email using their own magic link — once they do, they'll see this trip too.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual exchange rates</CardTitle>
          <p className="text-xs text-muted-foreground">
            {ratesUpdatedAt ? `Last updated ${new Date(ratesUpdatedAt).toLocaleString()}` : 'Never updated — using defaults'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">1 ISK equals:</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CURRENCIES.filter((c) => c !== 'ISK').map((c) => (
              <div key={c} className="space-y-1.5">
                <Label htmlFor={`rate-${c}`}>{c}</Label>
                <Input
                  id={`rate-${c}`}
                  type="number"
                  step="any"
                  value={rates[c as CurrencyCode]}
                  onChange={(e) => setRates((prev) => ({ ...prev, [c]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
          <Button size="sm" onClick={saveRates}>
            <Plus className="size-4" /> Save rates
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
