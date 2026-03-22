import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-[hsl(38_92%_50%)]/20 text-[hsl(38_92%_65%)] border border-[hsl(38_92%_50%)]/30',
        secondary:
          'bg-[hsl(240_6%_15%)] text-[hsl(0_0%_70%)] border border-[hsl(var(--border))]',
        outline:
          'border border-[hsl(var(--border))] text-[hsl(0_0%_80%)] bg-transparent',
        success:
          'bg-[hsl(142_71%_45%)]/20 text-[hsl(142_71%_65%)] border border-[hsl(142_71%_45%)]/30',
        warning:
          'bg-[hsl(38_92%_50%)]/20 text-[hsl(38_92%_65%)] border border-[hsl(38_92%_50%)]/30',
        destructive:
          'bg-[hsl(0_72%_51%)]/20 text-[hsl(0_72%_70%)] border border-[hsl(0_72%_51%)]/30',
        accent:
          'bg-[hsl(217_91%_60%)]/20 text-[hsl(217_91%_70%)] border border-[hsl(217_91%_60%)]/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
