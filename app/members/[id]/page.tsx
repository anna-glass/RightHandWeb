"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MemberDetail } from "@/components/member-detail"
import { PageLayout } from "@/components/page-layout"
import { useRouter, useParams } from "next/navigation"
import { useProfile } from "@/lib/supabase/hooks"

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const memberId = params.id as string
  const { profile, loading, error } = useProfile(memberId)

  const handleBack = () => {
    router.push("/members")
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar activeView="members" onViewChange={(view) => {
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
        <AppSidebar activeView="members" onViewChange={(view) => {
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
      <AppSidebar activeView="members" onViewChange={(view) => {
        if (view === "conversations") router.push("/conversations")
        else router.push("/members")
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <MemberDetail member={profile} onBack={handleBack} />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
