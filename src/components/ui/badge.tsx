import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#fff2ef] text-[#7c1405]',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-[#ffe0d9] text-[#7c1405]',
        success: 'border-transparent bg-[#eae7e7] text-[#444141]',
        warning: 'border-transparent bg-[#ffc4b8] text-[#4d170e]',
        outline: 'border-primary text-primary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
