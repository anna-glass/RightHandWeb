import * as React from "react"
import { cn } from "@/lib/utils"
import { typography } from "@/lib/typography"

interface PageLayoutProps {
  children: React.ReactNode
  title: string
  className?: string
}

export function PageLayout({ children, title, className }: PageLayoutProps) {
  return (
    <div className="p-4 bg-muted flex-1 flex flex-col">
      <div className={cn("bg-background rounded-lg p-6 flex-1", className)}>
        <h1 className={cn(typography.h3, "mb-6")}>{title}</h1>
        {children}
      </div>
    </div>
  )
}
