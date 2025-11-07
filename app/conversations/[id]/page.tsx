"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ConversationDetail } from "@/components/conversation-detail"
import { PageLayout } from "@/components/page-layout"
import { useRouter, useParams } from "next/navigation"
import { useConversation } from "@/lib/supabase/hooks"

export default function ConversationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string
  const { conversation, loading, error } = useConversation(conversationId)

  const handleBack = () => {
    router.push("/conversations")
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar activeView="conversations" onViewChange={(view) => {
          if (view === "members") router.push("/members")
          else router.push("/conversations")
        }} />
        <SidebarInset className="h-screen">
          <PageLayout>
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading conversation...</p>
            </div>
          </PageLayout>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (error || !conversation) {
    return (
      <SidebarProvider>
        <AppSidebar activeView="conversations" onViewChange={(view) => {
          if (view === "members") router.push("/members")
          else router.push("/conversations")
        }} />
        <SidebarInset className="h-screen">
          <PageLayout>
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">
                {error ? `Error: ${error.message}` : "Conversation not found"}
              </p>
            </div>
          </PageLayout>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView="conversations" onViewChange={(view) => {
        if (view === "members") router.push("/members")
        else router.push("/conversations")
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <ConversationDetail conversation={conversation} onBack={handleBack} />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
