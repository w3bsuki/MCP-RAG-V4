import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium font-mono transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-terminal-gray text-terminal-black border-2 border-terminal-darkgray shadow-raised hover:shadow-raised-thick active:shadow-sunken",
        destructive: "bg-terminal-red text-terminal-white border-2 border-terminal-darkgray shadow-raised hover:shadow-raised-thick active:shadow-sunken",
        outline: "border-2 border-terminal-darkgray bg-transparent text-terminal-white shadow-raised hover:bg-terminal-gray hover:text-terminal-black hover:shadow-raised-thick active:shadow-sunken",
        secondary: "bg-terminal-darkgray text-terminal-white border-2 border-terminal-darkgray shadow-raised hover:shadow-raised-thick active:shadow-sunken",
        ghost: "text-terminal-white hover:bg-terminal-gray hover:text-terminal-black hover:shadow-raised active:shadow-sunken",
        link: "text-terminal-green underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }