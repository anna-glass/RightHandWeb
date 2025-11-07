"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar, type SidebarView } from "@/components/app-sidebar"
import { MembersTable } from "@/components/members-table"
import { ConversationsTable } from "@/components/conversations-table"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"

export default function Home() {
  const [activeView, setActiveView] = React.useState<SidebarView>("members")

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} onViewChange={setActiveView} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className={cn(typography.h3)}>
            {activeView === "members" ? "Members" : "Conversations"}
          </h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {activeView === "members" ? <MembersTable /> : <ConversationsTable />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
