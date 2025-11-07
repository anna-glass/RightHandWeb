import * as React from "react"
import { cn } from "@/lib/utils"
import { typography } from "@/lib/typography"

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function PageLayout({ children, title, className }: PageLayoutProps) {
  return (
    <div className="pr-4 pt-4 pb-4 h-full flex flex-col">
      <div
        className={cn("bg-white/80 backdrop-blur-md rounded-lg p-6 flex-1 overflow-auto", className)}
        style={{ overscrollBehavior: 'contain' }}
      >
        {title && <h1 className={cn(typography.h3, "mb-6")}>{title}</h1>}
        {children}
      </div>
    </div>
  )
}
