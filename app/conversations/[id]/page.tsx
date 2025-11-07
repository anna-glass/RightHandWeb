"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ConversationDetail } from "@/components/conversation-detail"
import { PageLayout } from "@/components/page-layout"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useConversation, useProfile } from "@/lib/supabase/hooks"

export default function ConversationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const conversationId = params.id as string

  // Parse navigation path
  const pathParam = searchParams.get('path') || ''
  const pathParts = pathParam ? pathParam.split(',') : []

  // Check if there's a member in the path
  const memberInPath = pathParts.find(p => p.startsWith('member-'))
  const memberId = memberInPath ? memberInPath.replace('member-', '') : null
  const isFromMember = !!memberId

  const { conversation, loading, error } = useConversation(conversationId)
  const { profile: memberProfile, loading: memberLoading } = useProfile(isFromMember ? memberId : null)

  const handleBack = () => {
    if (isFromMember) {
      router.push("/members")
    } else {
      router.push("/conversations")
    }
  }

  const handleBackToMember = () => {
    if (memberId) {
      // Build path without the conversation
      const memberIndex = pathParts.findIndex(p => p.startsWith('member-'))
      const newPath = memberIndex >= 0 ? pathParts.slice(0, memberIndex + 1) : []
      const pathStr = newPath.length > 0 ? `?path=${newPath.join(',')}` : ''
      router.push(`/members/${memberId}${pathStr}`)
    }
  }

  if (loading || (isFromMember && memberLoading)) {
    return (
      <SidebarProvider>
        <AppSidebar activeView={isFromMember ? "members" : "conversations"} onViewChange={(view) => {
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
        <AppSidebar activeView={isFromMember ? "members" : "conversations"} onViewChange={(view) => {
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
      <AppSidebar activeView={isFromMember ? "members" : "conversations"} onViewChange={(view) => {
        if (view === "members") router.push("/members")
        else router.push("/conversations")
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <ConversationDetail
            conversation={conversation}
            onBack={handleBack}
            fromMember={isFromMember ? memberProfile : null}
            onBackToMember={handleBackToMember}
          />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
