import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full bg-terminal-white border-2 border-inset border-terminal-gray px-2 py-1 text-sm text-terminal-black font-mono file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-terminal-darkgray focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-darkgray disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }