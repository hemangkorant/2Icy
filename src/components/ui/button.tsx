import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] hover:shadow active:bg-[color-mix(in_srgb,var(--primary)_80%,black)]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-[color-mix(in_srgb,var(--destructive)_88%,black)] active:bg-[color-mix(in_srgb,var(--destructive)_76%,black)]',
        outline: 'border-border bg-transparent hover:border-foreground/30 hover:bg-black/[0.03] active:bg-black/[0.06]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,var(--secondary)_92%,black)] active:bg-[color-mix(in_srgb,var(--secondary)_84%,black)]',
        ghost: 'border-transparent text-primary hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)]',
        link: 'text-link underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-9 px-3.5 py-2 text-sm',
        sm: 'min-h-8 px-3 text-sm',
        lg: 'min-h-11 px-6 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'
