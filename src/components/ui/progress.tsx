'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  showPercentage?: boolean
  label?: string
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, showPercentage = false, label, ...props }, ref) => (
  <div className="w-full space-y-1.5">
    {(label || showPercentage) && (
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-sm text-[hsl(0_0%_80%)]">{label}</span>
        )}
        {showPercentage && (
          <span className="text-sm font-medium text-[hsl(38_92%_50%)]">
            {Math.round(value ?? 0)}%
          </span>
        )}
      </div>
    )}
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-[hsl(240_6%_15%)]',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-gradient-to-r from-[hsl(38_92%_50%)] to-[hsl(38_92%_60%)] transition-all duration-500 ease-in-out"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
