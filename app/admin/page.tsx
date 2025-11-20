"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { Send, Search, Plus } from "lucide-react"
import { SyncLoader } from "react-spinners"

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [user, setUser] = React.useState<any>(null)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [contentReady, setContentReady] = React.useState(false)

  // Conversation state
  const [messages, setMessages] = React.useState<any[]>([])
  const [newMessage, setNewMessage] = React.useState("")

  // Whiteboard state
  const [whiteboardContent, setWhiteboardContent] = React.useState("")

  // Users list state
  const [users, setUsers] = React.useState<any[]>([])
  const [selectedUser, setSelectedUser] = React.useState<any>(null)
  const [usersLoading, setUsersLoading] = React.useState(true)

  // User calendar state
  const [userProfile, setUserProfile] = React.useState<any>(null)
  const [calendarEvents, setCalendarEvents] = React.useState<any[]>([])
  const [calendarLoading, setCalendarLoading] = React.useState(true)
  const [calendarError, setCalendarError] = React.useState<string | null>(null)

  // Notes state
  const [notes, setNotes] = React.useState("")

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("")

  // Time state
  const [currentTime, setCurrentTime] = React.useState("")

  // Preload images
  React.useEffect(() => {
    let loadedCount = 0
    const imagesToLoad = ['/homebackground.png', '/whitelogo.png']

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

      if (!user || !user.email?.endsWith('@getrighthand.com')) {
        router.push('/signin')
        return
      }

      setUser(user)
      setLoading(false)

      // Load users list
      loadUsers()
    }

    checkAuth()
  }, [supabase, router])

  const loadUsers = async () => {
    try {
      setUsersLoading(true)

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

      setUsers(profiles || [])

      // Auto-select first user or aglasspal@gmail.com
      const defaultUser = profiles?.find(p => p.email === 'aglasspal@gmail.com') || profiles?.[0]
      if (defaultUser) {
        setSelectedUser(defaultUser)
        await loadUserCalendar(defaultUser.email)
        await loadUserMessages(defaultUser.id)
      }

      setContentReady(true)
    } catch (error) {
      console.error('Error loading users:', error)
      setContentReady(true)
    } finally {
      setUsersLoading(false)
    }
  }

  const loadUserCalendar = async (email: string) => {
    try {
      setCalendarLoading(true)
      setCalendarError(null)

      const response = await fetch(`/api/admin/user-calendar?email=${email}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch calendar data')
      }

      setUserProfile(data.profile)
      setCalendarEvents(data.events || [])

      if (!data.calendarConnected) {
        setCalendarError('User has not connected Google Calendar')
      }
    } catch (error) {
      console.error('Error loading user calendar:', error)
      setCalendarError(error instanceof Error ? error.message : 'Failed to load calendar')
    } finally {
      setCalendarLoading(false)
    }
  }

  const loadUserMessages = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('imessages')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleUserSelect = (user: any) => {
    setSelectedUser(user)
    loadUserCalendar(user.email)
    loadUserMessages(user.id) // Load iMessages for this user
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !userProfile) return

    const message = {
      id: Date.now(),
      content: newMessage,
      sender: 'admin',
      timestamp: new Date().toISOString(),
    }

    setMessages([...messages, message])
    setNewMessage("")
  }

  // Format date smartly based on how recent it is
  const formatSmartDate = (dateString: string | null) => {
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <SyncLoader color="#ffffff" size={10} />
      </div>
    )
  }

  return (
    <div
      className="relative flex flex-col h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/homebackground.png)' }}
    >
      {/* Dark overlay with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>

      {/* macOS-style Toolbar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-2 backdrop-blur-sm">
        {/* Left side - Logo */}
        <div className="flex items-center gap-8">
          <div className="w-24 h-6 flex-shrink-0">
            <Image
              src="/whitelogo.png"
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
        <div className="flex flex-1 gap-4 bg-white rounded-3xl p-3 shadow-2xl">
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
                      <img
                        src={user.avatar_url}
                        alt={user.first_name ? `${user.first_name} ${user.last_name}` : user.phone_number}
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
        {userProfile ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 pt-24 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.message_id}
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
                      "text-base",
                      message.event === 'message.sent' ? "text-white" : "text-gray-900"
                    )}>{message.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Overlaid Profile Header */}
            <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-10">
              <div className="flex flex-col items-center">
                {/* Profile Image with negative margin to overlap capsule */}
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.first_name ? `${userProfile.first_name} ${userProfile.last_name}` : userProfile.phone_number}
                    className="w-16 h-16 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.15)] relative z-10 -mb-2"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 shadow-[0_0_10px_rgba(0,0,0,0.15)] flex items-center justify-center relative z-10 -mb-2">
                    {userProfile?.first_name && userProfile?.last_name ? (
                      <span className="text-lg font-medium text-gray-600">
                        {userProfile.first_name[0]}{userProfile.last_name[0]}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Name Capsule with Backdrop Blur */}
                <div className="px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]">
                  <p className={cn(typography.bodySmall, "font-medium text-gray-900")}>
                    {userProfile?.first_name && userProfile?.last_name
                      ? `${userProfile.first_name} ${userProfile.last_name}`
                      : userProfile?.phone_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Input - iMessage Style */}
            <div className="p-4">
              <div className="flex items-center gap-3">
                {/* Plus Button */}
                <button className="h-9 w-9 rounded-full bg-white hover:bg-gray-50 transition-colors flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]">
                  <Plus className="w-5 h-5 text-gray-700" />
                </button>

                {/* iMessage Input Capsule */}
                <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 h-9 shadow-[0_0_8px_rgba(0,0,0,0.1)]">
                  <Input
                    type="text"
                    placeholder="iMessage"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="flex-1 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-base placeholder:text-gray-500"
                  />
                  {newMessage.trim() && (
                    <button
                      onClick={handleSendMessage}
                      className="flex-shrink-0"
                    >
                      <Send className="w-4 h-4 text-blue-500" />
                    </button>
                  )}
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

        {/* Right Panel - Notes */}
        <div className="w-[480px] flex flex-col bg-gray-50 overflow-hidden -mr-3 -mt-3 -mb-3 rounded-r-3xl border-l border-gray-200">
        {/* Notes Content */}
        <div className="flex-1 p-4">
          <textarea
            placeholder="Take notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-full resize-none border-0 bg-transparent rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-base"
          />
        </div>
        </div>
      </div>
    </div>
    </div>
  )
}
