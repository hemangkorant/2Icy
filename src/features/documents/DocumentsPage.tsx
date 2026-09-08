import { zodResolver } from '@hookform/resolvers/zod'
import { IconDownload, IconFileUpload, IconLock, IconLockOpen, IconTrash, IconVault } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { BulkUploadDialog } from '@/components/common/bulk-upload-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { useTrip } from '@/context/trip-context'
import { useVault } from '@/context/vault-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import { parseBookingPdf, type ImportedBooking } from '@/lib/booking-import'
import { decryptDocumentTitle, downloadEncryptedDocument, uploadEncryptedDocument } from '@/lib/document-upload'
import { formatFriendlyDate } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

const passphraseSchema = z.object({ passphrase: z.string().min(8, 'Use at least 8 characters') })
const confirmSchema = z.object({ passphrase: z.string().min(8, 'Use at least 8 characters'), confirm: z.string() })

export function DocumentsPage() {
  const { isSetUp, isUnlocked, checking, unlock, setUpVault, lock } = useVault()

  if (checking) return <LoadingState label="Checking vault status…" />

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Encrypted vault for passports, insurance, and booking confirmations."
        action={
          isUnlocked ? (
            <Button variant="outline" size="sm" onClick={lock}>
              <IconLock className="size-4" /> Lock vault
            </Button>
          ) : undefined
        }
      />
      {!isSetUp && <VaultSetup onSetUp={setUpVault} />}
      {isSetUp && !isUnlocked && <VaultUnlock onUnlock={unlock} />}
      {isSetUp && isUnlocked && <VaultContents />}
    </div>
  )
}

function VaultSetup({ onSetUp }: { onSetUp: (passphrase: string) => Promise<{ error: string | null }> }) {
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof confirmSchema>>({ resolver: zodResolver(confirmSchema) })

  const onSubmit = async (values: z.infer<typeof confirmSchema>) => {
    if (values.passphrase !== values.confirm) {
      setError('Passphrases do not match')
      return
    }
    setError(null)
    const { error: setupError } = await onSetUp(values.passphrase)
    if (setupError) setError(setupError)
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconVault className="size-5" /> Set up your document vault
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-md bg-warning/10 p-3 text-xs text-warning-foreground">
          Choose a passphrase and share it with your partner outside this app (in person, or a password manager). It is never stored
          anywhere — <span className="font-semibold">if you lose it, encrypted documents cannot be recovered.</span>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="passphrase">Vault passphrase</Label>
            <Input id="passphrase" type="password" {...register('passphrase')} />
            {errors.passphrase && <p className="text-sm text-destructive">{errors.passphrase.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm passphrase</Label>
            <Input id="confirm" type="password" {...register('confirm')} />
          </div>
          {watch('passphrase') && watch('confirm') && watch('passphrase') !== watch('confirm') && (
            <p className="text-sm text-destructive">Passphrases do not match</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Setting up…' : 'Create vault'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function VaultUnlock({ onUnlock }: { onUnlock: (passphrase: string) => Promise<{ error: string | null }> }) {
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<z.infer<typeof passphraseSchema>>({ resolver: zodResolver(passphraseSchema) })

  const onSubmit = async (values: z.infer<typeof passphraseSchema>) => {
    setError(null)
    const { error: unlockError } = await onUnlock(values.passphrase)
    if (unlockError) setError(unlockError)
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconLockOpen className="size-5" /> Unlock the vault
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="passphrase">Vault passphrase</Label>
            <Input id="passphrase" type="password" autoFocus {...register('passphrase')} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Unlocking…' : 'Unlock'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function VaultContents() {
  const { activeTripId } = useTrip()
  const { user } = useAuth()
  const { key } = useVault()
  const docs = useRealtimeTable('documents', 'trip_id', activeTripId, { orderBy: 'created_at', ascending: false })
  const stays = useRealtimeTable('accommodations', 'trip_id', activeTripId, { orderBy: 'check_in_date' })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<Tables<'documents'> | null>(null)

  if (docs.loading) return <LoadingState label="Loading documents…" />
  if (docs.error) return <ErrorState message={docs.error} onRetry={docs.refresh} />

  const totalBytes = docs.data.reduce((sum, d) => sum + d.size_bytes, 0)
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1)
  const stayOptions = stays.data.map((s) => ({
    id: s.id,
    label: `${s.name}${s.check_in_date ? ` — ${formatFriendlyDate(s.check_in_date)}` : ''}`,
  }))
  const stayNameById = new Map(stays.data.map((s) => [s.id, s.name]))

  const handleDelete = async (doc: Tables<'documents'>) => {
    await supabase.storage.from('trip-documents').remove([doc.storage_path])
    await docs.remove(doc.id)
  }

  const handleDownload = async (doc: Tables<'documents'>) => {
    if (!key) return
    try {
      await downloadEncryptedDocument(key, doc)
    } catch (e) {
      toast({ title: 'Could not decrypt document', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {docs.data.length} documents · {totalMb} MB stored
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <IconFileUpload className="size-4" /> Upload documents
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <IconFileUpload className="size-4" /> Import booking PDF
          </Button>
        </div>
      </div>

      {docs.data.length === 0 ? (
        <EmptyState
          icon={<IconVault className="size-8" />}
          title="No documents yet"
          description="Upload passports, insurance, and confirmations — encrypted before they leave your browser."
        />
      ) : (
        <div className="space-y-2">
          {docs.data.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              vaultKey={key}
              linkedStayName={
                doc.linked_entity_type === 'accommodation' && doc.linked_entity_id ? stayNameById.get(doc.linked_entity_id) : undefined
              }
              onDownload={() => handleDownload(doc)}
              onDelete={() => setDeleting(doc)}
            />
          ))}
        </div>
      )}

      {key && activeTripId && user && (
        <BulkUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          vaultKey={key}
          tripId={activeTripId}
          ownerId={user.id}
          stayOptions={stayOptions}
          onUploaded={() => docs.refresh()}
        />
      )}
      <BookingImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (file, bookings) => {
          if (!key || !activeTripId || !user) return
          const insertedIds: string[] = []
          for (const booking of bookings) {
            if (booking.kind === 'flight') {
              const { kind: _kind, ...flight } = booking
              const { data, error } = await supabase
                .from('flights')
                .insert({ trip_id: activeTripId, ...flight })
                .select('id')
                .single()
              if (error) throw new Error(error.message)
              insertedIds.push(data.id)
            } else if (booking.kind === 'accommodation') {
              const { kind: _kind, ...accommodation } = booking
              const { data, error } = await supabase
                .from('accommodations')
                .insert({ trip_id: activeTripId, ...accommodation })
                .select('id')
                .single()
              if (error) throw new Error(error.message)
              insertedIds.push(data.id)
            } else {
              const { kind: _kind, ...rentalCar } = booking
              const { data, error } = await supabase
                .from('rental_cars')
                .insert({ trip_id: activeTripId, ...rentalCar })
                .select('id')
                .single()
              if (error) throw new Error(error.message)
              insertedIds.push(data.id)
            }
          }
          const category =
            bookings[0]?.kind === 'flight'
              ? 'flight_confirmation'
              : bookings[0]?.kind === 'accommodation'
                ? 'accommodation_confirmation'
                : 'car_rental_confirmation'
          await uploadEncryptedDocument({
            tripId: activeTripId,
            ownerId: user.id,
            vaultKey: key,
            category,
            linkedEntityType:
              bookings[0]?.kind === 'flight' ? 'flight' : bookings[0]?.kind === 'accommodation' ? 'accommodation' : 'rental_car',
            linkedEntityId: insertedIds[0] ?? null,
            title: file.name,
            file,
          })
          await docs.refresh()
          toast({ title: 'Booking imported', description: `${bookings.length} record${bookings.length === 1 ? '' : 's'} added.` })
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Permanently delete this document?"
        description="This removes the encrypted file from storage. This cannot be undone."
        destructive
        confirmLabel="Delete"
        onConfirm={() => deleting && handleDelete(deleting)}
      />
    </div>
  )
}

function BookingImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (file: File, bookings: ImportedBooking[]) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [bookings, setBookings] = useState<ImportedBooking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setBookings([])
      setError(null)
    }
  }, [open])

  const selectFile = async (nextFile: File | null) => {
    setFile(nextFile)
    setBookings([])
    setError(null)
    if (!nextFile) return
    setParsing(true)
    try {
      const parsed = await parseBookingPdf(nextFile)
      if (parsed.length === 0) throw new Error('No supported flight, stay, or rental booking was detected.')
      setBookings(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this PDF.')
    } finally {
      setParsing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import booking PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The PDF is read in your browser. Review the detected records before they are added to your trip.
          </p>
          <Input type="file" accept="application/pdf" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} />
          {parsing && <p className="text-sm text-muted-foreground">Reading PDF…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {bookings.length > 0 && (
            <div className="space-y-2">
              {bookings.map((booking, index) => (
                <Card key={`${booking.kind}-${index}`}>
                  <CardContent className="space-y-1 p-3 text-sm">
                    <p className="font-medium capitalize">{booking.kind.replace('_', ' ')}</p>
                    {booking.kind === 'flight' && (
                      <p>
                        {booking.airline} {booking.flight_number} · {booking.departure_airport} → {booking.arrival_airport}
                      </p>
                    )}
                    {booking.kind === 'flight' && (
                      <p className="text-muted-foreground">
                        {booking.departure_at} → {booking.arrival_at}
                      </p>
                    )}
                    {booking.kind === 'accommodation' && (
                      <p>
                        {booking.name} · {booking.check_in_date} → {booking.check_out_date}
                      </p>
                    )}
                    {booking.kind === 'accommodation' && (
                      <p className="text-muted-foreground">
                        {booking.address} · Confirmation {booking.confirmation_number}
                      </p>
                    )}
                    {booking.kind === 'rental_car' && (
                      <p>
                        {booking.rental_company} · {booking.car_model}
                      </p>
                    )}
                    {booking.kind === 'rental_car' && (
                      <p className="text-muted-foreground">
                        {booking.pickup_at} → {booking.dropoff_at} · Confirmation {booking.confirmation_number}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={!file || bookings.length === 0 || parsing || saving}
            onClick={async () => {
              if (!file || bookings.length === 0) return
              setSaving(true)
              try {
                await onImport(file, bookings)
                onOpenChange(false)
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save imported booking.')
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Importing…' : 'Confirm import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DocumentRow({
  doc,
  vaultKey,
  linkedStayName,
  onDownload,
  onDelete,
}: {
  doc: Tables<'documents'>
  vaultKey: CryptoKey | null
  linkedStayName?: string
  onDownload: () => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState<string>('Decrypting…')

  useEffect(() => {
    if (!vaultKey) return
    decryptDocumentTitle(vaultKey, doc)
      .then(setTitle)
      .catch(() => setTitle('(could not decrypt)'))
  }, [vaultKey, doc])

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">
              {doc.category.replace(/_/g, ' ')}
            </Badge>
            {linkedStayName && (
              <Badge variant="secondary" className="text-[10px]">
                {linkedStayName}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{(doc.size_bytes / 1024).toFixed(0)} KB</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" size="icon" onClick={onDownload} aria-label="Download">
            <IconDownload className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
            <IconTrash className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
