"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { PageLayout } from "@/components/page-layout"
import { useRouter, useParams } from "next/navigation"
import { useProfile } from "@/lib/supabase/hooks"

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const { profile, loading, error } = useProfile(userId)

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar activeView="chats" onViewChange={(view) => {
          if (view === "members") router.push("/members")
          else router.push("/chats")
        }} />
        <SidebarInset className="h-screen">
          <PageLayout>
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading chat...</p>
            </div>
          </PageLayout>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (error || !profile) {
    return (
      <SidebarProvider>
        <AppSidebar activeView="chats" onViewChange={(view) => {
          if (view === "members") router.push("/members")
          else router.push("/chats")
        }} />
        <SidebarInset className="h-screen">
          <PageLayout>
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">
                {error ? `Error: ${error.message}` : "User not found"}
              </p>
            </div>
          </PageLayout>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView="chats" onViewChange={(view) => {
        if (view === "members") router.push("/members")
        else router.push("/chats")
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <ChatInterface userId={userId} profile={profile} />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
