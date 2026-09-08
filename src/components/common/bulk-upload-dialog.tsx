import { IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { uploadEncryptedDocument } from '@/lib/document-upload'
import type { DocumentCategory, DocumentLinkedEntity } from '@/types/database'

const CATEGORIES: DocumentCategory[] = [
  'passport',
  'travel_insurance',
  'flight_confirmation',
  'accommodation_confirmation',
  'car_rental_confirmation',
  'tour_voucher',
  'driving_licence',
  'other',
]

interface StayOption {
  id: string
  label: string
}

interface BulkUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vaultKey: CryptoKey
  tripId: string
  ownerId: string
  defaultCategory?: DocumentCategory
  /** Fixed link used when `stayOptions` isn't provided (e.g. uploading from a specific stay's card). */
  linkedEntityType?: DocumentLinkedEntity
  linkedEntityId?: string | null
  /** When provided, shows a "Link to a stay" selector instead of a fixed link — used from the general vault page. */
  stayOptions?: StayOption[]
  onUploaded?: () => void
}

function stripExtension(name: string) {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  vaultKey,
  tripId,
  ownerId,
  defaultCategory = 'other',
  linkedEntityType,
  linkedEntityId,
  stayOptions,
  onUploaded,
}: BulkUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [titles, setTitles] = useState<string[]>([])
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory)
  const [selectedStayId, setSelectedStayId] = useState<string>(linkedEntityId ?? 'none')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null)

  useEffect(() => {
    if (open) {
      setFiles([])
      setTitles([])
      setCategory(defaultCategory)
      setSelectedStayId(linkedEntityId ?? 'none')
      setProgress(null)
    }
  }, [open, defaultCategory, linkedEntityId])

  const handleFiles = (fileList: FileList | null) => {
    const picked = Array.from(fileList ?? [])
    setFiles(picked)
    setTitles(picked.map((f) => stripExtension(f.name)))
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setTitles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    const resolvedLinkType: DocumentLinkedEntity | undefined = stayOptions
      ? selectedStayId === 'none'
        ? undefined
        : 'accommodation'
      : linkedEntityType
    const resolvedLinkId = stayOptions ? (selectedStayId === 'none' ? null : selectedStayId) : (linkedEntityId ?? null)
    const failures: string[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress({ index: i, total: files.length })
      try {
        await uploadEncryptedDocument({
          tripId,
          ownerId,
          vaultKey,
          category,
          linkedEntityType: resolvedLinkType,
          linkedEntityId: resolvedLinkId,
          title: titles[i]?.trim() || stripExtension(files[i].name),
          file: files[i],
        })
      } catch {
        failures.push(files[i].name)
      }
    }
    setProgress({ index: files.length, total: files.length })
    setUploading(false)
    onUploaded?.()
    if (failures.length === 0) {
      toast({ title: `Uploaded ${files.length} document${files.length === 1 ? '' : 's'}` })
      onOpenChange(false)
    } else {
      toast({
        title: `${files.length - failures.length}/${files.length} uploaded`,
        description: `Failed: ${failures.join(', ')}`,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-doc-files">Files</Label>
            <Input id="bulk-doc-files" type="file" multiple onChange={(e) => handleFiles(e.target.files)} />
            <p className="text-xs text-muted-foreground">
              Select multiple files to upload them all at once — each is encrypted individually before leaving your browser.
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-1.5">
              <Label>Titles</Label>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={titles[i] ?? ''}
                      onChange={(e) => setTitles((prev) => prev.map((t, idx) => (idx === i ? e.target.value : t)))}
                      className="h-8 text-sm"
                    />
                    <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => removeFile(i)} aria-label="Remove">
                      <IconTrash className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Applied to every file in this batch.</p>
          </div>

          {stayOptions && (
            <div className="space-y-1.5">
              <Label>Link to a stay</Label>
              <Select value={selectedStayId} onValueChange={setSelectedStayId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>
                  {stayOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {progress && (
            <p className="text-xs text-muted-foreground">
              {uploading ? `Uploading ${progress.index + 1} of ${progress.total}…` : `Uploaded ${progress.index} of ${progress.total}`}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={files.length === 0 || uploading} onClick={handleUpload}>
            {uploading ? 'Uploading…' : `Upload ${files.length || ''} document${files.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
