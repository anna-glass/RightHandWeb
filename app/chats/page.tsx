"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatsView } from "@/components/chats-view"
import { PageLayout } from "@/components/page-layout"
import { useRouter } from "next/navigation"
import { useProfiles } from "@/lib/supabase/hooks"
import { createClient } from "@/lib/supabase/browser"

export default function ChatsPage() {
  const router = useRouter()
  const { profiles } = useProfiles()
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Find the user with the oldest unresponded message
  React.useEffect(() => {
    async function findOldestUnrespondedChat() {
      if (profiles.length === 0) return

      const supabase = createClient()

      try {
        // Get all messages grouped by user
        const { data: allMessages, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })

        if (error) throw error

        // Group messages by user_id
        const messagesByUser = new Map<string, any[]>()
        allMessages?.forEach(msg => {
          if (!messagesByUser.has(msg.user_id)) {
            messagesByUser.set(msg.user_id, [])
          }
          messagesByUser.get(msg.user_id)!.push(msg)
        })

        // Find user with oldest unresponded message
        let oldestUnrespondedUser: string | null = null
        let oldestUnrespondedTime: Date | null = null

        messagesByUser.forEach((messages, userId) => {
          // Check if last message is from user (not assistant)
          const lastMessage = messages[messages.length - 1]
          if (lastMessage.sender === 'user') {
            const messageTime = new Date(lastMessage.created_at)
            if (!oldestUnrespondedTime || messageTime < oldestUnrespondedTime) {
              oldestUnrespondedTime = messageTime
              oldestUnrespondedUser = userId
            }
          }
        })

        // If no unresponded messages, default to user with most recent activity
        if (!oldestUnrespondedUser && messagesByUser.size > 0) {
          let mostRecentUser: string | null = null
          let mostRecentTime: Date | null = null

          messagesByUser.forEach((messages, userId) => {
            const lastMessage = messages[messages.length - 1]
            const messageTime = new Date(lastMessage.created_at)
            if (!mostRecentTime || messageTime > mostRecentTime) {
              mostRecentTime = messageTime
              mostRecentUser = userId
            }
          })

          oldestUnrespondedUser = mostRecentUser
        }

        // If still no user found, default to first profile
        if (!oldestUnrespondedUser && profiles.length > 0) {
          oldestUnrespondedUser = profiles[0].id
        }

        setSelectedUserId(oldestUnrespondedUser)
      } catch (error) {
        console.error('Error finding oldest unresponded chat:', error)
        // Default to first profile
        if (profiles.length > 0) {
          setSelectedUserId(profiles[0].id)
        }
      } finally {
        setLoading(false)
      }
    }

    findOldestUnrespondedChat()
  }, [profiles])

  if (loading || !selectedUserId) {
    return (
      <SidebarProvider>
        <AppSidebar activeView="chats" onViewChange={(view) => {
          if (view === "members") router.push("/members")
          else if (view === "righthands") router.push("/righthands")
        }} />
        <SidebarInset className="h-screen">
          <PageLayout>
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading chats...</p>
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
      }} />
      <SidebarInset className="h-screen">
        <PageLayout>
          <ChatsView
            selectedUserId={selectedUserId}
            onUserChange={setSelectedUserId}
            profiles={profiles}
          />
        </PageLayout>
      </SidebarInset>
    </SidebarProvider>
  )
}
