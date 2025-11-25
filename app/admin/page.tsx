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
import { HumanRequestsPanel } from "./components/HumanRequestsPanel"
import { formatCurrentTime, filterUsers, handleRealtimeMessage } from "./utils"
import { styles } from "./styles"
import type { UserProfile, Message, HumanRequest } from "./types"

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
  const [currentTime, setCurrentTime] = useState(() => formatCurrentTime())
  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages')
  const [humanRequests, setHumanRequests] = useState<HumanRequest[]>([])

  // update time every minute
  useEffect(() => {
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

  // load human requests
  const loadHumanRequests = useCallback(async () => {
    const res = await fetch('/api/human-requests')
    if (res.ok) {
      const data = await res.json()
      setHumanRequests(data.requests || [])
    }
  }, [])

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

    await loadHumanRequests()
    setContentReady(true)
  }, [supabase, loadUserMessages, loadHumanRequests])

  // human request handlers
  const handleCompleteRequest = useCallback(async (requestId: string, notes?: string) => {
    await fetch('/api/human-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status: 'completed', notes, sendNotification: true })
    })
    await loadHumanRequests()
  }, [loadHumanRequests])

  const handleUpdateRequestStatus = useCallback(async (requestId: string, status: HumanRequest['status']) => {
    await fetch('/api/human-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status, sendNotification: false })
    })
    await loadHumanRequests()
  }, [loadHumanRequests])

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

  // realtime human requests subscription
  useEffect(() => {
    const channel = supabase
      .channel('human_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'human_requests' },
        () => { loadHumanRequests() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadHumanRequests])

  const pendingRequestsCount = humanRequests.filter(r => r.status === 'pending' || r.status === 'in_progress').length

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
          <div className="w-80 flex flex-col">
            <div className="flex border-b border-gray-200 mb-2">
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'messages'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'requests'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Requests
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            </div>
            {activeTab === 'messages' && (
              <UsersList
                users={filteredUsers}
                selectedUserId={selectedUser?.id || null}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onUserSelect={handleUserSelect}
              />
            )}
          </div>
          {activeTab === 'messages' ? (
            <ChatPanel user={selectedUser} messages={messages} />
          ) : (
            <HumanRequestsPanel
              requests={humanRequests}
              users={users}
              onComplete={handleCompleteRequest}
              onUpdateStatus={handleUpdateRequestStatus}
            />
          )}
        </div>
      </div>
    </div>
  )
}
