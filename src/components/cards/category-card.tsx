import { type HTMLAttributes, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface Category {
  id: string
  name: string
  description: string
  icon: ReactNode
  experiences: number
}

interface CategoryCardProps extends HTMLAttributes<HTMLDivElement> {
  category: Category
}

export function CategoryCard({ category, className, ...props }: CategoryCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-between gap-6 rounded-xl border border-border/60 bg-card/60 p-6 shadow-sm transition hover:-translate-y-1 hover:bg-card hover:shadow-md",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {category.icon}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{category.name}</h3>
            <Badge variant="soft" className="text-[11px]">
              {category.experiences} experiences
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{category.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        Explore more
        <ChevronRight className="size-4" />
      </div>
    </div>
  )
}
