/**
 * app/admin/page.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { getAllProfiles, getPhoneByProfileId, getMessagesByUser } from "@/lib/db"
import { images } from "@/lib/images"
import { LoadingScreen } from "@/components/loading-screen"
import { ADMIN_EMAIL_DOMAIN } from "@/lib/constants"
import { Toolbar } from "./components/Toolbar"
import { UsersList } from "./components/UsersList"
import { ChatPanel } from "./components/ChatPanel"
import { formatCurrentTime, filterUsers, handleRealtimeMessage } from "./utils"
import { styles } from "./styles"
import type { UserProfile, Message } from "./types"

/**
 * AdminPage
 * admin dashboard with user search and conversation history.
 */
export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  // loading states
  const [loading, setLoading] = useState(true)
  const [contentReady, setContentReady] = useState(false)

  // data states
  const [users, setUsers] = useState<UserProfile[]>([])
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTime, setCurrentTime] = useState("")

  // update time every minute
  useEffect(() => {
    setCurrentTime(formatCurrentTime())
    const interval = setInterval(() => setCurrentTime(formatCurrentTime()), 60000)
    return () => clearInterval(interval)
  }, [])

  // load messages for a user
  const loadUserMessages = useCallback(async (profileId: string) => {
    const phoneNumber = await getPhoneByProfileId(supabase, profileId)
    if (!phoneNumber) {
      setMessages([])
      return
    }
    const data = await getMessagesByUser(supabase, profileId, phoneNumber)
    setMessages(data as Message[])
  }, [supabase])

  // load users list
  const loadUsers = useCallback(async () => {
    const { data: profiles, error } = await getAllProfiles(supabase)

    if (error) {
      setContentReady(true)
      return
    }

    setUsers((profiles || []) as UserProfile[])

    const defaultUser = profiles?.find((p: UserProfile) => p.email === 'aglasspal@gmail.com') || profiles?.[0]
    if (defaultUser) {
      setSelectedUser(defaultUser)
      await loadUserMessages(defaultUser.id)
    }

    setContentReady(true)
  }, [supabase, loadUserMessages])

  // check auth and load data
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !user.email?.endsWith(ADMIN_EMAIL_DOMAIN)) {
        router.push('/signin')
        return
      }

      setLoading(false)
      loadUsers()
    }

    checkAuth()
  }, [supabase, router, loadUsers])

  // realtime messages subscription
  useEffect(() => {
    if (!selectedUser?.id || !selectedUser?.phone_number) return

    const channel = supabase
      .channel(`messages:${selectedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'imessages',
          filter: `sender=eq.${selectedUser.phone_number}`
        },
        (payload) => {
          setMessages(prev => handleRealtimeMessage(
            prev,
            payload.eventType,
            payload.new as Message,
            payload.old as Message
          ))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedUser?.id, selectedUser?.phone_number, supabase])

  const filteredUsers = useMemo(() => filterUsers(users, searchQuery), [users, searchQuery])

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user)
    loadUserMessages(user.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  if (loading || !contentReady) {
    return <LoadingScreen />
  }

  return (
    <div className={styles.container} style={{ backgroundImage: `url(${images.backgrounds.home})` }}>
      <div className={styles.overlay} />
      <Toolbar currentTime={currentTime} onLogout={handleLogout} />
      <div className={styles.content}>
        <div className={styles.mainPanel}>
          <UsersList
            users={filteredUsers}
            selectedUserId={selectedUser?.id || null}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onUserSelect={handleUserSelect}
          />
          <ChatPanel user={selectedUser} messages={messages} />
        </div>
      </div>
    </div>
  )
}
