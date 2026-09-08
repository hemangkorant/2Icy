import { IconAlertTriangle, IconInbox, IconLoader2, IconWifiOff } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-muted-foreground" role="status" aria-live="polite">
      <IconLoader2 className="size-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-14 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {icon ?? <IconInbox className="size-6" />}
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 py-14 px-6 text-center" role="alert">
      <IconAlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function OfflineNotice({ savedAt }: { savedAt?: string | null }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
      <IconWifiOff className="size-3.5 shrink-0" />
      <span>
        You&apos;re offline — showing the last synced data{savedAt ? ` from ${new Date(savedAt).toLocaleString()}` : ''}. Changes
        you make now won&apos;t save until you&apos;re back online.
      </span>
    </div>
  )
}
