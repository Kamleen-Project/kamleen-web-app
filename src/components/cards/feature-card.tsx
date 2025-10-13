import { type HTMLAttributes, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface FeatureCardProps extends HTMLAttributes<HTMLDivElement> {
  icon: ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description, className, ...props }: FeatureCardProps) {
  return (
    <Card
      className={cn(
        "h-full gap-4 border-border/60 bg-background/80 p-6 transition hover:-translate-y-1 hover:shadow-md",
        className
      )}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  )
}
