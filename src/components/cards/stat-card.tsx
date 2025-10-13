import { type HTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  label: string
  description?: string
}

export function StatCard({ value, label, description, className, ...props }: StatCardProps) {
  return (
    <Card
      className={cn("h-full items-start gap-3 border-border/60 bg-background/80 p-6", className)}
      {...props}
    >
      <span className="text-3xl font-semibold text-primary">{value}</span>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </Card>
  )
}
