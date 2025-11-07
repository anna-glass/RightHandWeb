"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ConversationsTable } from "@/components/conversations-table"
import { PageLayout } from "@/components/page-layout"
import { useRouter } from "next/navigation"
import type { Conversation } from "@/components/conversations-table"

export default function ConversationsPage() {
  const router = useRouter()

  const handleConversationClick = (conversation: Conversation) => {
    router.push(`/conversations/${conversation.id}`)
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView="conversations" onViewChange={(view) => {
        if (view === "members") router.push("/members")
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <ConversationsTable onConversationClick={handleConversationClick} />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
