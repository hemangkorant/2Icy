import { zodResolver } from '@hookform/resolvers/zod'
import { IconCashBanknote, IconDownload, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
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
import { convert, CURRENCIES, DEFAULT_RATES, formatMoney, type ExchangeRates } from '@/lib/currency'
import { supabase } from '@/lib/supabase'
import type { CurrencyCode, ExpenseCategory, Tables } from '@/types/database'
import { type ExpenseFormInput, type ExpenseFormValues, expenseSchema } from '@/types/schemas'

const CATEGORIES: ExpenseCategory[] = ['food', 'activities', 'fuel', 'accommodation', 'transport', 'souvenirs', 'groceries', 'other']

export function ExpensesPage() {
  const { activeTripId, members } = useTrip()
  const expenses = useRealtimeTable('expenses', 'trip_id', activeTripId, { orderBy: 'expense_date', ascending: false })
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES)
  const [homeCurrency, setHomeCurrency] = useState<CurrencyCode>('INR')
  const [profiles, setProfiles] = useState<Record<string, string>>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'expenses'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'expenses'> | null>(null)

  useEffect(() => {
    if (!activeTripId) return
    supabase
      .from('app_settings')
      .select('exchange_rates')
      .eq('trip_id', activeTripId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.exchange_rates) setRates(data.exchange_rates as ExchangeRates)
      })
  }, [activeTripId])

  useEffect(() => {
    const ids = members.map((m) => m.user_id).filter((id): id is string => Boolean(id))
    if (ids.length === 0) return
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const p of data ?? []) map[p.id] = p.full_name || p.email
        setProfiles(map)
      })
  }, [members])

  const totals = useMemo(() => {
    const byCategory = new Map<string, number>()
    const byPerson = new Map<string, number>()
    const byCurrency = new Map<string, number>()
    let grandTotalHome = 0
    for (const e of expenses.data) {
      const amountHome = convert(e.amount, e.currency, homeCurrency, rates)
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + amountHome)
      const person = e.payer_id ? profiles[e.payer_id] ?? 'Unknown' : 'Unassigned'
      byPerson.set(person, (byPerson.get(person) ?? 0) + amountHome)
      byCurrency.set(e.currency, (byCurrency.get(e.currency) ?? 0) + e.amount)
      grandTotalHome += amountHome
    }
    return { byCategory, byPerson, byCurrency, grandTotalHome }
  }, [expenses.data, rates, homeCurrency, profiles])

  if (expenses.loading) return <LoadingState label="Loading expenses…" />
  if (expenses.error) return <ErrorState message={expenses.error} onRetry={expenses.refresh} />

  const handleSubmit = async (values: ExpenseFormValues) => {
    try {
      const convertedAmount = convert(values.amount, values.currency, homeCurrency, rates)
      const payload = {
        category: values.category,
        expense_date: values.expense_date,
        amount: values.amount,
        currency: values.currency,
        converted_amount: convertedAmount,
        converted_currency: homeCurrency,
        exchange_rate: rates[values.currency],
        payer_id: values.payer_id || null,
        split_method: values.split_method,
        notes: values.notes || null,
      }
      if (editing) await expenses.update(editing.id, payload)
      else await expenses.insert({ trip_id: activeTripId!, ...payload })
      setFormOpen(false)
    } catch (e) {
      toast({ title: 'Could not save expense', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const exportCsv = () => {
    const header = ['date', 'category', 'amount', 'currency', 'converted_amount', 'converted_currency', 'payer', 'split_method', 'notes']
    const rows = expenses.data.map((e) => [
      e.expense_date,
      e.category,
      e.amount,
      e.currency,
      e.converted_amount ?? '',
      e.converted_currency ?? '',
      e.payer_id ? profiles[e.payer_id] ?? '' : '',
      e.split_method,
      (e.notes ?? '').replace(/\n/g, ' ').replace(/,/g, ';'),
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'iceland-trip-expenses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track spend across categories, days, and people."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <IconDownload className="size-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <IconPlus className="size-4" /> Add expense
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total spend</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold">{formatMoney(totals.grandTotalHome, homeCurrency)}</p>
              <Select value={homeCurrency} onValueChange={(v) => setHomeCurrency(v as CurrencyCode)}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="mb-1 text-xs text-muted-foreground">By category</p>
            <div className="space-y-0.5 text-xs">
              {[...totals.byCategory.entries()].map(([cat, amt]) => (
                <div key={cat} className="flex justify-between">
                  <span className="capitalize">{cat}</span>
                  <span>{formatMoney(amt, homeCurrency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="mb-1 text-xs text-muted-foreground">By person</p>
            <div className="space-y-0.5 text-xs">
              {[...totals.byPerson.entries()].map(([person, amt]) => (
                <div key={person} className="flex justify-between">
                  <span>{person}</span>
                  <span>{formatMoney(amt, homeCurrency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {expenses.data.length === 0 ? (
        <EmptyState icon={<IconCashBanknote className="size-8" />} title="No expenses logged yet" description="Add spend as you go to keep a running total." />
      ) : (
        <div className="space-y-2">
          {expenses.data.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {expense.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{expense.expense_date}</span>
                  </div>
                  <p className="font-medium">
                    {formatMoney(expense.amount, expense.currency)}
                    {expense.converted_currency && expense.converted_currency !== expense.currency && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({formatMoney(expense.converted_amount ?? 0, expense.converted_currency)})
                      </span>
                    )}
                  </p>
                  {expense.notes && <p className="truncate text-xs text-muted-foreground">{expense.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(expense); setFormOpen(true) }}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(expense)} aria-label="Delete">
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} initial={editing} members={members} profiles={profiles} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this expense?"
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) await expenses.remove(deleting.id)
        }}
      />
    </div>
  )
}

function ExpenseForm({
  open,
  onOpenChange,
  initial,
  members,
  profiles,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'expenses'> | null
  members: Tables<'trip_members'>[]
  profiles: Record<string, string>
  onSubmit: (values: ExpenseFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({ resolver: zodResolver(expenseSchema) })

  useEffect(() => {
    if (open) {
      reset({
        category: initial?.category ?? 'food',
        expense_date: initial?.expense_date ?? new Date().toISOString().slice(0, 10),
        amount: initial?.amount ?? 0,
        currency: initial?.currency ?? 'ISK',
        payer_id: initial?.payer_id ?? '',
        split_method: initial?.split_method ?? 'equal',
        notes: initial?.notes ?? '',
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit expense' : 'Add expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={watch('category')} onValueChange={(v) => setValue('category', v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense_date">Date</Label>
              <Input id="expense_date" type="date" {...register('expense_date')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="any" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v as CurrencyCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payer</Label>
              <Select value={watch('payer_id') || undefined} onValueChange={(v) => setValue('payer_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m) => m.user_id)
                    .map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id as string}>
                        {profiles[m.user_id as string] ?? 'Traveler'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Split method</Label>
              <Select value={watch('split_method')} onValueChange={(v) => setValue('split_method', v as ExpenseFormValues['split_method'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['equal', 'custom', 'none'].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
