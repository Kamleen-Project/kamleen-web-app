import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "soft"
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "outline" && "border-border text-foreground",
        variant === "soft" && "border-transparent bg-primary/10 text-primary",
        className
      )}
      {...props}
    />
  )
}
