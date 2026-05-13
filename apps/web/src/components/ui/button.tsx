import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base: full transition-all (not just colors) for active:scale to work,
  // duration-150 matches the 150ms sweet spot from ui-ux-pro-max §7,
  // active:scale-[0.97] gives tactile press feedback,
  // focus-visible ring uses the design token ring colour.
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold',
    'ring-offset-background',
    'transition-all duration-150 ease-out',
    'active:scale-[0.97]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary action — solid green
        default:
          'bg-primary text-primary-foreground shadow-card-sm hover:opacity-90 hover:shadow-card',
        // Secondary action — bordered, green tint on hover (not amber)
        outline:
          'border border-input bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/30 hover:shadow-card-sm',
        // Tertiary / nav — no border, muted hover
        ghost:
          'hover:bg-muted hover:text-foreground',
      },
      size: {
        // h-11 = 44px — meets the ui-ux-pro-max 44×44 touch target minimum
        default: 'h-11 px-4 py-2',
        // sm intentionally smaller for dense filter bars; use sparingly
        sm: 'h-9 rounded-md px-3',
        // lg for prominent CTAs
        lg: 'h-12 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
