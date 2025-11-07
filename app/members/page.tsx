"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MembersTable } from "@/components/members-table"
import { PageLayout } from "@/components/page-layout"
import { useRouter } from "next/navigation"
import type { Member } from "@/components/members-table"

export default function MembersPage() {
  const router = useRouter()

  const handleMemberClick = (member: Member) => {
    router.push(`/members/${member.id}`)
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView="members" onViewChange={(view) => {
        if (view === "conversations") router.push("/conversations")
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <MembersTable onMemberClick={handleMemberClick} />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
