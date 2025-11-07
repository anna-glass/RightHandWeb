"use client"

import * as React from "react"
import { User, Bot, Search, Send } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/components/conversations-table"
import { useMessages, useAddresses, createMessage } from "@/lib/supabase/hooks"

interface ConversationDetailProps {
  conversation: Conversation
  onBack: () => void
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

type Message = {
  id: string
  conversation_id: string | null
  sender: 'user' | 'assistant' | null
  content: string
  created_at: string
}

export function ConversationDetail({ conversation, onBack }: ConversationDetailProps) {
  const { messages, loading, error } = useMessages(conversation.id)
  const { addresses, loading: addressesLoading } = useAddresses(conversation.user_id || null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [memorySearch, setMemorySearch] = React.useState("")
  const [newMessage, setNewMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [optimisticMessages, setOptimisticMessages] = React.useState<Message[]>([])

  const memberName = conversation.profile
    ? [conversation.profile.first_name, conversation.profile.last_name].filter(Boolean).join(' ') || 'User'
    : 'User'

  const profilePicture = conversation.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.user_id}`
  const joinedDate = conversation.profile?.created_at
    ? new Date(conversation.profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown'

  // Mock data for memories and notes (these would typically come from a separate table)
  const defaultMemories = [
    "Hair salon: The Style Studio on 5th Ave",
    "Preferred restaurant: Casa Milano",
    "Coffee order: Oat milk latte, extra hot",
  ]

  const [memoriesText, setMemoriesText] = React.useState(() => defaultMemories.join('\n'))
  const [notesText, setNotesText] = React.useState("")
  const [conversationNotesText, setConversationNotesText] = React.useState("")

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    const optimisticId = `optimistic-${Date.now()}`

    // Create optimistic message
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: conversation.id,
      sender: 'assistant',
      content: messageContent,
      created_at: new Date().toISOString()
    }

    try {
      setSending(true)
      setNewMessage("")

      // Add optimistic message immediately
      setOptimisticMessages(prev => [...prev, optimisticMessage])

      await createMessage({
        conversation_id: conversation.id,
        sender: 'assistant',
        content: messageContent
      })
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message. Please try again.')
      // Remove the optimistic message on error
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId))
      // Restore the message text
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const filteredMemoriesText = React.useMemo(() => {
    if (!memorySearch.trim()) return memoriesText
    const searchLower = memorySearch.toLowerCase()
    const lines = memoriesText.split('\n')
    return lines.filter(line =>
      line.toLowerCase().includes(searchLower)
    ).join('\n')
  }, [memoriesText, memorySearch])

  // Clean up optimistic messages when real messages arrive
  React.useEffect(() => {
    if (optimisticMessages.length > 0 && messages.length > 0) {
      const latestRealMessage = messages[messages.length - 1]
      setOptimisticMessages(prev =>
        prev.filter(opt => opt.content !== latestRealMessage.content)
      )
    }
  }, [messages, optimisticMessages.length])

  // Combine real and optimistic messages
  const displayMessages = React.useMemo(() => {
    return [...messages, ...optimisticMessages]
  }, [messages, optimisticMessages])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [displayMessages])

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-6rem)]">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={onBack}
              className="cursor-pointer"
            >
              Conversations
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{conversation.title || 'Untitled'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Column - Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1" />
            <div className="max-w-3xl mx-auto space-y-6 px-4 py-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className={cn(typography.body, "text-muted-foreground")}>Loading messages...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className={cn(typography.body, "text-destructive")}>Error loading messages: {error.message}</p>
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className={cn(typography.body, "text-muted-foreground")}>No messages yet</p>
                </div>
              ) : (
                <>
                  {displayMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex w-full",
                        message.sender === "assistant" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.sender === "assistant" ? (
                        // Assistant message with card
                        <div className="flex gap-4 items-start max-w-[60%] bg-muted p-4 rounded-lg">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <img
                                src="/righthandlogo.png"
                                alt="Right Hand"
                                className="flex-shrink-0 w-5 h-5 rounded object-cover"
                              />
                              <span className={cn(typography.label)}>Right Hand</span>
                              <span className={cn(typography.caption)}>{formatTime(message.created_at)}</span>
                            </div>
                            <div
                              className={cn(
                                typography.body,
                                "whitespace-pre-wrap leading-relaxed"
                              )}
                            >
                              {message.content}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // User message without card
                        <div className="flex gap-4 items-start max-w-[60%]">
                          <img
                            src={profilePicture}
                            alt={memberName}
                            className="flex-shrink-0 w-8 h-8 rounded-md bg-muted object-cover"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={cn(typography.label)}>{memberName}</span>
                              <span className={cn(typography.caption)}>{formatTime(message.created_at)}</span>
                            </div>
                            <div
                              className={cn(
                                typography.body,
                                "whitespace-pre-wrap leading-relaxed"
                              )}
                            >
                              {message.content}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t pt-4 pb-2">
            <div className="max-w-3xl mx-auto px-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Type a message as Right Hand..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - User Info Panel */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 h-full">
          {/* Conversation Notes Card */}
          <div className="bg-muted p-6 rounded-lg flex-shrink-0">
            <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Conversation Notes</h4>
            <textarea
              value={conversationNotesText}
              onChange={(e) => setConversationNotesText(e.target.value)}
              placeholder="Add notes about this conversation..."
              className={cn(
                typography.bodySmall,
                "w-full h-[120px] p-3 rounded-lg resize-none",
                "focus:outline-none border-0 bg-background"
              )}
            />
          </div>

          {/* Profile & User Info Card */}
          <div className="bg-muted p-6 rounded-lg space-y-6 flex-1 overflow-y-auto">
            {/* Profile Section */}
            <div className="flex items-start gap-4">
              <img
                src={profilePicture}
                alt={memberName}
                className="size-16 bg-background rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className={cn(typography.bodySmall, "font-medium")}>{memberName}</h3>
                <p className={cn(typography.bodySmall, "text-muted-foreground truncate")}>
                  {conversation.profile?.email}
                </p>
              </div>
            </div>

            <Separator />

            {/* Address Book Section */}
            <div>
              <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Address Book</h4>
              {addressesLoading ? (
                <p className={cn(typography.bodySmall, "text-muted-foreground")}>Loading addresses...</p>
              ) : addresses.length === 0 ? (
                <p className={cn(typography.bodySmall, "text-muted-foreground")}>No addresses found</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div key={address.id} className="space-y-1">
                      <p className={cn(typography.label, "text-muted-foreground")}>{address.name}</p>
                      <p className={cn(typography.bodySmall)}>
                        {address.street}<br />
                        {address.city}, {address.state} {address.zip_code}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Memories Section */}
            <div>
              <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Memories</h4>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search memories..."
                  value={memorySearch}
                  onChange={(e) => setMemorySearch(e.target.value)}
                  className="pl-9 border-gray-300"
                />
              </div>
              <textarea
                value={memorySearch.trim() ? filteredMemoriesText : memoriesText}
                onChange={(e) => {
                  if (!memorySearch.trim()) {
                    setMemoriesText(e.target.value)
                  }
                }}
                placeholder={
                  memorySearch.trim() && filteredMemoriesText.trim() === ''
                    ? "No memories found"
                    : "Add memories here..."
                }
                className={cn(
                  typography.bodySmall,
                  "w-full min-h-[150px] p-3 rounded-lg resize-y",
                  "focus:outline-none border-0 bg-background",
                  memorySearch.trim() && "bg-muted/50"
                )}
                disabled={memorySearch.trim().length > 0}
              />
            </div>

            <Separator />

            {/* Notes Section */}
            <div>
              <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Notes</h4>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Add notes here..."
                className={cn(
                  typography.bodySmall,
                  "w-full min-h-[150px] p-3 rounded-lg resize-y",
                  "focus:outline-none border-0 bg-background"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
