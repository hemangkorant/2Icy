import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  "inline-flex items-center justify-start gap-1.5 whitespace-nowrap border border-transparent font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[#dd2b0f] active:bg-[#ae1800]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-[#7c1405] active:bg-[#4d170e]',
        outline: 'border-border bg-transparent hover:bg-black/5 active:bg-black/10',
        secondary: 'border-border bg-transparent text-foreground hover:bg-black/5 active:bg-black/10',
        ghost: 'border-transparent px-1 text-primary hover:bg-[#fff2ef] active:bg-[#ffe0d9]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-9 px-3.5 py-2 text-sm',
        sm: 'min-h-9 px-3 text-sm',
        lg: 'min-h-11 px-6 text-sm',
        icon: 'h-9 w-9 justify-center p-0',
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
