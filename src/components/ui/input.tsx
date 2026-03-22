import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[hsl(0_0%_80%)]"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-[hsl(240_5%_15%)] px-3 py-2 text-sm text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_5%_45%)] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(38_92%_50%)] focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-[hsl(0_72%_51%)] focus:ring-[hsl(0_72%_51%)]'
              : 'border-[hsl(240_5%_18%)] hover:border-[hsl(240_5%_28%)]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-[hsl(0_72%_60%)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[hsl(240_5%_55%)]">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
