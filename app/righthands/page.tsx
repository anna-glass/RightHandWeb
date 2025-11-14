"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { RighthandsTable } from "@/components/righthands-table"
import { PageLayout } from "@/components/page-layout"
import { useRouter } from "next/navigation"
import type { Righthand } from "@/components/righthands-table"

export default function RighthandsPage() {
  const router = useRouter()

  const handleRighthandClick = (righthand: Righthand) => {
    router.push(`/righthands/${righthand.id}`)
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView="righthands" onViewChange={(view) => {
        if (view === "chats") router.push("/chats")
        else if (view === "members") router.push("/members")
        else router.push("/righthands")
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <div className="w-full p-6">
            <RighthandsTable onRighthandClick={handleRighthandClick} />
          </div>
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
