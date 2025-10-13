import { type HTMLAttributes } from "react"
import { ArrowUpRight, BadgeCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export interface Host {
  id: string
  name: string
  headline: string
  bio: string
  experiencesHosted: number
  rating: number
}

interface HostCardProps extends HTMLAttributes<HTMLDivElement> {
  host: Host
}

export function HostCard({ host, className, ...props }: HostCardProps) {
  return (
    <Card className={cn("h-full border-border/50 bg-background", className)} {...props}>
      <CardHeader className="mb-2 flex flex-row items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {host.name
            .split(" ")
            .slice(0, 2)
            .map((chunk) => chunk.charAt(0))
            .join("")}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BadgeCheck className="size-4 text-primary" />
            Verified host
          </div>
          <h3 className="text-xl font-semibold text-foreground">{host.name}</h3>
          <p className="text-sm text-muted-foreground">{host.headline}</p>
        </div>
      </CardHeader>
      <CardContent className="gap-4 text-sm text-muted-foreground">
        <p>{host.bio}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="outline" className="text-xs">
            {host.experiencesHosted}+ experiences
          </Badge>
          <Badge variant="soft" className="text-xs">
            Rating {host.rating.toFixed(1)} / 5
          </Badge>
        </div>
        <Button variant="ghost" className="w-fit px-0 text-primary">
          View profile
          <ArrowUpRight className="ml-2 size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
