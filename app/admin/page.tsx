"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { Search, Plus } from "lucide-react"
import { images } from "@/lib/images"
import { LoadingScreen } from "@/components/loading-screen"
import { ADMIN_EMAIL_DOMAIN } from "@/lib/constants"

interface UserProfile {
  id: string
  email?: string | null
  phone_number?: string | null
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  created_at?: string | null
}

interface Message {
  message_id?: string | number
  event?: string
  text?: string
  sender?: string
  created_at?: string
  id?: number
  content?: string
  timestamp?: string
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [contentReady, setContentReady] = React.useState(false)

  // Conversation state
  const [messages, setMessages] = React.useState<Message[]>([])

  // Users list state
  const [users, setUsers] = React.useState<UserProfile[]>([])
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("")

  // Time state
  const [currentTime, setCurrentTime] = React.useState("")

  // Preload images
  React.useEffect(() => {
    let loadedCount = 0
    const imagesToLoad = [images.backgrounds.home, images.logo.light]

    const checkAllLoaded = () => {
      loadedCount++
      if (loadedCount === imagesToLoad.length) {
        setImageLoaded(true)
      }
    }

    imagesToLoad.forEach((src) => {
      const img = new window.Image()
      img.src = src
      img.onload = checkAllLoaded
      img.onerror = checkAllLoaded // Continue even if image fails to load
    })
  }, [])

  // Update time every minute
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const datePart = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).replace(',', '')
      const timePart = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      const formatted = `${datePart} ${timePart}`
      setCurrentTime(formatted)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Check authentication
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !user.email?.endsWith(ADMIN_EMAIL_DOMAIN)) {
        router.push('/signin')
        return
      }

      setLoading(false)

      // Load users list
      loadUsers()
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router])

  const loadUsers = async () => {
    try {
      // Fetch all profiles from the database
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        setContentReady(true)
        return
      }

      setUsers((profiles || []) as UserProfile[])

      // Auto-select first user or aglasspal@gmail.com
      const defaultUser = profiles?.find(p => p.email === 'aglasspal@gmail.com') || profiles?.[0]
      if (defaultUser) {
        setSelectedUser(defaultUser)
        await loadUserMessages(defaultUser.id)
      }

      setContentReady(true)
    } catch (error) {
      console.error('Error loading users:', error)
      setContentReady(true)
    }
  }

  const loadUserMessages = async (profileId: string) => {
    try {
      // First get the user's phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', profileId)
        .single()

      if (!profile?.phone_number) {
        console.log('No phone number found for profile')
        setMessages([])
        return
      }

      // Load messages by matching sender phone number OR profile_id
      const { data, error } = await supabase
        .from('imessages')
        .select('*')
        .or(`profile_id.eq.${profileId},sender.eq.${profile.phone_number}`)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      setMessages((data || []) as Message[])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Set up real-time subscription for messages
  React.useEffect(() => {
    if (!selectedUser?.id || !selectedUser?.phone_number) return

    // Subscribe to new messages for the selected user by phone number
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
          console.log('Message change:', payload)
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message])
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.message_id === (payload.new as Message).message_id
                  ? (payload.new as Message)
                  : msg
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) =>
              prev.filter((msg) => msg.message_id !== (payload.old as Message).message_id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedUser?.id, selectedUser?.phone_number, supabase])

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user)
    loadUserMessages(user.id) // Load iMessages for this user
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  // Format date smartly based on how recent it is
  const formatSmartDate = (dateString: string | null | undefined) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffTime = today.getTime() - dateOnly.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // If today, show time
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    // If within the last 7 days, show day name
    if (diffDays > 0 && diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' })
    }

    // Otherwise show date
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    })
  }

  // Filter users based on search query
  const filteredUsers = React.useMemo(() => {
    if (!searchQuery.trim()) return users

    const query = searchQuery.toLowerCase()
    return users.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
      const email = user.email?.toLowerCase() || ''
      const phone = user.phone_number?.toLowerCase() || ''

      return fullName.includes(query) || email.includes(query) || phone.includes(query)
    })
  }, [users, searchQuery])

  if (loading || !imageLoaded || !contentReady) {
    return <LoadingScreen />
  }

  return (
    <div
      className="relative flex flex-col h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${images.backgrounds.home})` }}
    >
      {/* Dark overlay with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>

      {/* macOS-style Toolbar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-2 backdrop-blur-sm">
        {/* Left side - Logo */}
        <div className="flex items-center gap-8">
          <div className="w-24 h-6 flex-shrink-0">
            <Image
              src={images.logo.light}
              alt="Right Hand"
              width={96}
              height={96}
              className="rounded-full"
            />
          </div>
          <button
            onClick={handleLogout}
            className="text-white text-sm font-medium hover:opacity-70 transition-opacity"
          >
            Logout
          </button>
        </div>

        {/* Right side - Time */}
        <div className="text-white text-sm font-medium">
          {currentTime}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 p-6 pt-0">
        {/* White rounded container */}
        <div className="flex flex-1 gap-4 bg-white rounded-3xl p-3 shadow-2xl max-w-5xl mx-auto w-full">
        {/* Left Panel - Users List */}
        <div className="w-80 flex flex-col bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.1)] overflow-hidden">
          {/* Mac Window Controls */}
          <div className="px-4 pt-4 pb-5 flex items-center gap-2.5">
            <button className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors" title="Close" />
            <button className="w-4 h-4 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors" title="Minimize" />
            <button className="w-4 h-4 rounded-full bg-green-500 hover:bg-green-600 transition-colors" title="Maximize" />
          </div>

          {/* Search Bar */}
          <div className="px-4 pb-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full bg-gray-100 border-0 pl-11 pr-4 py-2.5 text-base focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className={cn(typography.body, "text-muted-foreground")}>
                  {searchQuery ? 'No users match your search' : 'No users found'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={cn(
                    "w-full p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-100",
                    selectedUser?.id === user.id && "bg-gray-100"
                  )}
                >
                  {/* Profile Image */}
                  <div className="flex-shrink-0">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.first_name ? `${user.first_name} ${user.last_name}` : user.phone_number || 'User'}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full border border-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.first_name && user.last_name ? (
                          <span className="text-base font-medium text-gray-600">
                            {user.first_name[0]}{user.last_name[0]}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Name and Phone (VStack) */}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-base font-medium truncate">
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.phone_number}
                    </p>
                    {user.first_name && user.last_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {user.phone_number || user.email}
                      </p>
                    )}
                  </div>

                  {/* Last Message Date */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-muted-foreground">
                      {formatSmartDate(user.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

      {/* Center Panel - Chat */}
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden relative">
        {selectedUser ? (
          <>
            {/* Messages - Full Height Scrollable Container */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
              <div className="p-4 pt-24 pb-20 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <p className={cn(typography.body, "text-muted-foreground")}>
                      No messages yet
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={message.message_id || index}
                      className={cn(
                        "flex",
                        message.event === 'message.sent' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-md rounded-2xl px-4 py-2",
                          message.event === 'message.sent'
                            ? "bg-[#007AFF]"
                            : "bg-gray-100"
                        )}
                      >
                        <p className={cn(
                          "text-base whitespace-pre-wrap break-words",
                          message.event === 'message.sent' ? "text-white" : "text-gray-900"
                        )}>{message.text || message.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          message.event === 'message.sent' ? "text-white/70" : "text-gray-500"
                        )}>
                          {message.created_at && new Date(message.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Overlaid Profile Header */}
            <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-10 pointer-events-none">
              <div className="flex flex-col items-center">
                {/* Profile Image with negative margin to overlap capsule */}
                {selectedUser?.avatar_url ? (
                  <Image
                    src={selectedUser.avatar_url}
                    alt={selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : selectedUser.phone_number || 'User'}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.15)] relative z-10 -mb-2"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 shadow-[0_0_10px_rgba(0,0,0,0.15)] flex items-center justify-center relative z-10 -mb-2">
                    {selectedUser?.first_name && selectedUser?.last_name ? (
                      <span className="text-lg font-medium text-gray-600">
                        {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Name Capsule with Backdrop Blur */}
                <div className="px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]">
                  <p className={cn(typography.bodySmall, "font-medium text-gray-900")}>
                    {selectedUser?.first_name && selectedUser?.last_name
                      ? `${selectedUser.first_name} ${selectedUser.last_name}`
                      : selectedUser?.phone_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Overlaid Message Input - iMessage Style (Disabled for display only) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 opacity-50 z-10 pointer-events-none">
              <div className="flex items-center gap-3">
                {/* Plus Button */}
                <button
                  disabled
                  className="h-9 w-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)] cursor-not-allowed"
                >
                  <Plus className="w-5 h-5 text-gray-700" />
                </button>

                {/* iMessage Input Capsule */}
                <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 h-9 shadow-[0_0_8px_rgba(0,0,0,0.1)]">
                  <Input
                    type="text"
                    placeholder="iMessage"
                    value=""
                    disabled
                    className="flex-1 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-base placeholder:text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className={cn(typography.body, "text-muted-foreground")}>
              No user data available
            </p>
          </div>
        )}
      </div>
        </div>
    </div>
    </div>
  )
}
