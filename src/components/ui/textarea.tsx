import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-[hsl(0_0%_80%)]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border bg-[hsl(240_5%_15%)] px-3 py-2 text-sm text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_5%_45%)] transition-colors resize-y',
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
Textarea.displayName = 'Textarea'

export { Textarea }
