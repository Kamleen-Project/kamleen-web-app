import { type HTMLAttributes } from "react"
import { Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

export interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  rating: number
}

interface TestimonialCardProps extends HTMLAttributes<HTMLDivElement> {
  testimonial: Testimonial
}

export function TestimonialCard({ testimonial, className, ...props }: TestimonialCardProps) {
  return (
    <Card
      className={cn(
        "h-full gap-5 border-border/50 bg-background/60 p-7 backdrop-blur",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1 text-amber-500">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              "size-4",
              index < Math.round(testimonial.rating) ? "fill-current" : "opacity-20"
            )}
          />
        ))}
      </div>
      <blockquote className="text-lg font-medium text-foreground/90">
        “{testimonial.quote}”
      </blockquote>
      <div className="mt-auto pt-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{testimonial.name}</p>
        <p>{testimonial.role}</p>
      </div>
    </Card>
  )
}
