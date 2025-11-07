"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar, type SidebarView } from "@/components/app-sidebar"
import { MembersTable, type Member } from "@/components/members-table"
import { ConversationsTable, type Conversation } from "@/components/conversations-table"
import { MemberDetail } from "@/components/member-detail"
import { ConversationDetail } from "@/components/conversation-detail"
import { PageLayout } from "@/components/page-layout"

export default function Home() {
  const [activeView, setActiveView] = React.useState<SidebarView>("members")
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null)
  const [selectedConversation, setSelectedConversation] = React.useState<Conversation | null>(null)

  const handleViewChange = (view: SidebarView) => {
    setActiveView(view)
    setSelectedMember(null) // Clear selected member when switching views
    setSelectedConversation(null) // Clear selected conversation when switching views
  }

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member)
  }

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation)
  }

  const handleBackToMembers = () => {
    setSelectedMember(null)
  }

  const handleBackToConversations = () => {
    setSelectedConversation(null)
  }

  const getHeaderTitle = () => {
    if (selectedMember) return selectedMember.name
    if (selectedConversation) return selectedConversation.subject
    return activeView === "members" ? "Members" : "Conversations"
  }

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} onViewChange={handleViewChange} />
      <SidebarInset className="h-screen">
        <PageLayout title={getHeaderTitle()}>
          {selectedMember ? (
            <MemberDetail member={selectedMember} onBack={handleBackToMembers} />
          ) : selectedConversation ? (
            <ConversationDetail conversation={selectedConversation} onBack={handleBackToConversations} />
          ) : activeView === "members" ? (
            <MembersTable onMemberClick={handleMemberClick} />
          ) : (
            <ConversationsTable onConversationClick={handleConversationClick} />
          )}
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
