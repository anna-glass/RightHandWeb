"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MemberDetail } from "@/components/member-detail"
import { PageLayout } from "@/components/page-layout"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useProfile, useConversation } from "@/lib/supabase/hooks"

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const memberId = params.id as string

  // Parse navigation path
  const pathParam = searchParams.get('path') || ''
  const pathParts = pathParam ? pathParam.split(',') : []

  // Check if there's a conversation in the path
  const convInPath = pathParts.find(p => p.startsWith('conv-'))
  const conversationId = convInPath ? convInPath.replace('conv-', '') : null
  const isFromConversation = !!conversationId

  const { profile, loading, error } = useProfile(memberId)
  const { conversation: conversationData, loading: conversationLoading } = useConversation(isFromConversation ? conversationId : null)

  const handleBack = () => {
    if (isFromConversation) {
      router.push("/conversations")
    } else {
      router.push("/members")
    }
  }

  const handleBackToConversation = () => {
    if (conversationId) {
      // Build path without the member
      const convIndex = pathParts.findIndex(p => p.startsWith('conv-'))
      const newPath = convIndex >= 0 ? pathParts.slice(0, convIndex + 1) : []
      const pathStr = newPath.length > 0 ? `?path=${newPath.join(',')}` : ''
      router.push(`/conversations/${conversationId}${pathStr}`)
    }
  }

  if (loading || (isFromConversation && conversationLoading)) {
    return (
      <SidebarProvider>
        <AppSidebar activeView={isFromConversation ? "conversations" : "members"} onViewChange={(view) => {
          if (view === "conversations") router.push("/conversations")
          else router.push("/members")
        }} />
        <SidebarInset className="h-screen">
          <PageLayout>
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading member...</p>
            </div>
          </PageLayout>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (error || !profile) {
    return (
      <SidebarProvider>
        <AppSidebar activeView={isFromConversation ? "conversations" : "members"} onViewChange={(view) => {
          if (view === "conversations") router.push("/conversations")
          else router.push("/members")
        }} />
        <SidebarInset className="h-screen">
          <PageLayout>
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">
                {error ? `Error: ${error.message}` : "Member not found"}
              </p>
            </div>
          </PageLayout>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView={isFromConversation ? "conversations" : "members"} onViewChange={(view) => {
        if (view === "conversations") router.push("/conversations")
        else router.push("/members")
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <MemberDetail
            member={profile}
            onBack={handleBack}
            fromConversation={isFromConversation ? conversationData : null}
            onBackToConversation={handleBackToConversation}
          />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
