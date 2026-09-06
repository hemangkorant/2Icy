import * as React from 'react'

import type { ToastVariant } from '@/components/ui/toast'

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

type Listener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener(toasts)
}

export function toast(input: Omit<ToastItem, 'id'>) {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, ...input }]
  emit()
  return id
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToast() {
  const [items, setItems] = React.useState<ToastItem[]>(toasts)

  React.useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  return { toasts: items, toast, dismiss: dismissToast }
}
