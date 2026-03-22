'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-[hsl(var(--background))] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[hsl(38_92%_50%)] text-[hsl(240_10%_4%)] hover:bg-[hsl(38_92%_44%)] shadow-sm',
        secondary:
          'bg-[hsl(240_6%_12%)] text-[hsl(0_0%_80%)] hover:bg-[hsl(240_6%_16%)] border border-[hsl(var(--border))]',
        outline:
          'border border-[hsl(var(--border))] bg-transparent text-[hsl(0_0%_95%)] hover:bg-[hsl(240_6%_12%)] hover:text-white',
        ghost:
          'bg-transparent text-[hsl(0_0%_80%)] hover:bg-[hsl(240_6%_12%)] hover:text-white',
        destructive:
          'bg-[hsl(0_72%_51%)] text-[hsl(0_0%_98%)] hover:bg-[hsl(0_72%_44%)] shadow-sm',
        link: 'text-[hsl(38_92%_50%)] underline-offset-4 hover:underline bg-transparent p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
