import { zodResolver } from '@hookform/resolvers/zod'
import {
  IconAlertTriangle,
  IconAmbulance,
  IconBuildingBank,
  IconCar,
  IconFirstAidKit,
  IconInfoCircle,
  IconPhone,
  IconPlus,
  IconShieldCheck,
  IconSparkles,
  IconTrash,
  IconUsers,
  type TablerIcon,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import type { EmergencyCategory, Tables } from '@/types/database'
import { type EmergencyContactFormInput, type EmergencyContactFormValues, emergencyContactSchema } from '@/types/schemas'

import { DEFAULT_EMERGENCY_CONTACTS } from './emergency-defaults'

const CATEGORIES: EmergencyCategory[] = ['emergency_services', 'health', 'embassy', 'insurance', 'roadside_assistance', 'family', 'other']
const CATEGORY_LABELS: Record<EmergencyCategory, string> = {
  emergency_services: 'Emergency services',
  health: 'Health',
  embassy: 'Embassy',
  insurance: 'Travel insurer',
  roadside_assistance: 'Roadside assistance',
  family: 'Family',
  other: 'Other',
}
const CATEGORY_ICONS: Record<EmergencyCategory, TablerIcon> = {
  emergency_services: IconAmbulance,
  health: IconFirstAidKit,
  embassy: IconBuildingBank,
  insurance: IconShieldCheck,
  roadside_assistance: IconCar,
  family: IconUsers,
  other: IconInfoCircle,
}

export function EmergencyPage() {
  const { activeTripId } = useTrip()
  const contacts = useRealtimeTable('emergency_contacts', 'trip_id', activeTripId, { orderBy: 'category' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'emergency_contacts'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'emergency_contacts'> | null>(null)

  if (contacts.loading) return <LoadingState label="Loading emergency contacts…" />
  if (contacts.error) return <ErrorState message={contacts.error} onRetry={contacts.refresh} />

  const seedDefaults = async () => {
    const existing = new Set(contacts.data.map((c) => c.name.toLowerCase()))
    const toAdd = DEFAULT_EMERGENCY_CONTACTS.filter((d) => !existing.has(d.name.toLowerCase()))
    await Promise.all(toAdd.map((d) => contacts.insert({ trip_id: activeTripId!, ...d })))
    toast({ title: `Added ${toAdd.length} default contacts` })
  }

  const handleSubmit = async (values: EmergencyContactFormValues) => {
    try {
      const payload = {
        category: values.category,
        country: values.country || null,
        name: values.name,
        phone: values.phone || null,
        whatsapp_phone: values.whatsapp_phone || null,
        email: values.email || null,
        address: values.address || null,
        notes: values.notes || null,
        needs_verification: values.needs_verification,
      }
      if (editing) await contacts.update(editing.id, payload)
      else await contacts.insert({ trip_id: activeTripId!, ...payload })
      setFormOpen(false)
    } catch (e) {
      toast({ title: 'Could not save contact', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Emergency"
        description="Iceland and India emergency contacts."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              <IconSparkles className="size-4" /> Add defaults
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <IconPlus className="size-4" /> Add contact
            </Button>
          </div>
        }
      />

      {contacts.data.length === 0 ? (
        <EmptyState title="No emergency contacts yet" description='Click "Add defaults" to start with Iceland 112 and standard entries.' />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.data.map((contact) => {
            const CategoryIcon = CATEGORY_ICONS[contact.category]
            return (
            <Card key={contact.id}>
              <CardContent className="space-y-1.5 p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <CategoryIcon className="size-4.5" />
                    </span>
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[contact.category]}
                        </Badge>
                        {contact.country && <span className="text-xs text-muted-foreground">{contact.country}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(contact); setFormOpen(true) }}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(contact)} aria-label="Delete">
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                </div>
                {contact.needs_verification && (
                  <p className="flex items-start gap-1.5 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
                    <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Verify before travel — details may be outdated.
                  </p>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-link hover:underline">
                    <IconPhone className="size-3.5" /> {contact.phone}
                  </a>
                )}
                {contact.address && <p className="text-xs text-muted-foreground">{contact.address}</p>}
                {contact.notes && <p className="text-xs text-muted-foreground">{contact.notes}</p>}
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}

      <EmergencyContactForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this contact?"
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) await contacts.remove(deleting.id)
        }}
      />
    </div>
  )
}

function EmergencyContactForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Tables<'emergency_contacts'> | null
  onSubmit: (values: EmergencyContactFormValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmergencyContactFormInput, unknown, EmergencyContactFormValues>({ resolver: zodResolver(emergencyContactSchema) })

  useEffect(() => {
    if (open) {
      reset({
        category: initial?.category ?? 'family',
        country: initial?.country ?? '',
        name: initial?.name ?? '',
        phone: initial?.phone ?? '',
        whatsapp_phone: initial?.whatsapp_phone ?? '',
        email: initial?.email ?? '',
        address: initial?.address ?? '',
        notes: initial?.notes ?? '',
        needs_verification: initial?.needs_verification ?? false,
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit contact' : 'Add contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={watch('category')} onValueChange={(v) => setValue('category', v as EmergencyCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp_phone">WhatsApp</Label>
              <Input id="whatsapp_phone" {...register('whatsapp_phone')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={watch('needs_verification')} onCheckedChange={(v) => setValue('needs_verification', Boolean(v))} />
            Needs verification before travel
          </label>
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
