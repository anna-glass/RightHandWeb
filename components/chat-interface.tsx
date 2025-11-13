"use client"

import * as React from "react"
import { Search, Send, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
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
import { Badge } from "@/components/ui/badge"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"
import {
  useMessages,
  useAddresses,
  useTasks,
  createMessage,
  updateProfile,
  createTask,
  updateTask,
  deleteTask
} from "@/lib/supabase/hooks"

type Profile = Database['public']['Tables']['profiles']['Row']
type Message = Database['public']['Tables']['messages']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface ChatInterfaceProps {
  userId: string
  profile: Profile
}

function formatTime(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function ChatInterface({ userId, profile }: ChatInterfaceProps) {
  const router = useRouter()
  const { messages, loading, error } = useMessages(userId)
  const { addresses, loading: addressesLoading } = useAddresses(userId)
  const { tasks, loading: tasksLoading } = useTasks(userId)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [memorySearch, setMemorySearch] = React.useState("")
  const [newMessage, setNewMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [optimisticMessages, setOptimisticMessages] = React.useState<Message[]>([])
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const [creatingTask, setCreatingTask] = React.useState(false)

  const memberName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'User'
  const profilePicture = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`

  // Initialize memories and notes from profile database
  const [memoriesText, setMemoriesText] = React.useState(profile.memories || '')
  const [notesText, setNotesText] = React.useState(profile.notes || '')
  const [isSavingMemories, setIsSavingMemories] = React.useState(false)
  const [isSavingNotes, setIsSavingNotes] = React.useState(false)

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    const optimisticId = `optimistic-${Date.now()}`

    // Create optimistic message
    const optimisticMessage: Message = {
      id: optimisticId,
      user_id: userId,
      sender: 'assistant',
      content: messageContent,
      created_at: new Date().toISOString(),
      attachments: null
    }

    try {
      setSending(true)
      setNewMessage("")

      // Add optimistic message immediately
      setOptimisticMessages(prev => [...prev, optimisticMessage])

      await createMessage({
        user_id: userId,
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

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || creatingTask) return

    try {
      setCreatingTask(true)
      await createTask({
        user_id: userId,
        title: newTaskTitle.trim(),
        status: 'open'
      })
      setNewTaskTitle("")
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Failed to create task. Please try again.')
    } finally {
      setCreatingTask(false)
    }
  }

  const handleToggleTaskStatus = async (task: Task) => {
    try {
      const newStatus = task.status === 'open' ? 'closed' : 'open'
      await updateTask(task.id, { status: newStatus })
    } catch (err) {
      console.error('Error updating task:', err)
      alert('Failed to update task. Please try again.')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
    } catch (err) {
      console.error('Error deleting task:', err)
      alert('Failed to delete task. Please try again.')
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

  // Auto-save memories after user stops typing
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (memoriesText !== profile.memories) {
        setIsSavingMemories(true)
        try {
          await updateProfile(userId, { memories: memoriesText })
        } catch (error) {
          console.error('Error saving memories:', error)
        } finally {
          setIsSavingMemories(false)
        }
      }
    }, 1000) // Save 1 second after user stops typing

    return () => clearTimeout(timeoutId)
  }, [memoriesText, userId, profile.memories])

  // Auto-save notes after user stops typing
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (notesText !== profile.notes) {
        setIsSavingNotes(true)
        try {
          await updateProfile(userId, { notes: notesText })
        } catch (error) {
          console.error('Error saving notes:', error)
        } finally {
          setIsSavingNotes(false)
        }
      }
    }, 1000) // Save 1 second after user stops typing

    return () => clearTimeout(timeoutId)
  }, [notesText, userId, profile.notes])

  const openTasks = tasks.filter(t => t.status === 'open')
  const closedTasks = tasks.filter(t => t.status === 'closed')

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-6rem)]">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={() => router.push("/members")}
              className="cursor-pointer"
            >
              Members
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{memberName}</BreadcrumbPage>
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
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 h-full overflow-y-auto">
          {/* Tasks Card */}
          <div className="bg-muted p-6 rounded-lg flex-shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className={cn(typography.bodySmall, "font-medium")}>Tasks</h4>
              <Badge variant="secondary">{openTasks.length} open</Badge>
            </div>

            {/* Create Task */}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="New task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateTask()
                  }
                }}
                disabled={creatingTask}
                className="flex-1 h-8 text-sm"
              />
              <Button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim() || creatingTask}
                size="icon"
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Open Tasks */}
            {tasksLoading ? (
              <p className={cn(typography.bodySmall, "text-muted-foreground")}>Loading tasks...</p>
            ) : openTasks.length === 0 ? (
              <p className={cn(typography.bodySmall, "text-muted-foreground")}>No open tasks</p>
            ) : (
              <div className="space-y-2">
                {openTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 bg-background p-2 rounded">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleToggleTaskStatus(task)}
                      className="mt-1 cursor-pointer"
                    />
                    <span className={cn(typography.bodySmall, "flex-1")}>{task.title}</span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Closed Tasks (collapsible) */}
            {closedTasks.length > 0 && (
              <details className="space-y-2">
                <summary className={cn(typography.bodySmall, "cursor-pointer text-muted-foreground")}>
                  {closedTasks.length} closed task{closedTasks.length !== 1 ? 's' : ''}
                </summary>
                <div className="space-y-2 mt-2">
                  {closedTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 bg-background p-2 rounded opacity-50">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleToggleTaskStatus(task)}
                        className="mt-1 cursor-pointer"
                      />
                      <span className={cn(typography.bodySmall, "flex-1 line-through")}>{task.title}</span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Profile & User Info Card */}
          <div className="bg-muted p-6 rounded-lg space-y-6">
            {/* Profile Section */}
            <div className="flex items-start gap-4">
              <img
                src={profilePicture}
                alt={memberName}
                className="size-16 bg-background rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className={cn(typography.bodySmall, "font-medium")}>{memberName}</h3>
                <p className={cn(typography.bodySmall, "text-muted-foreground truncate")}>
                  {profile.email}
                </p>
                {profile.phone_number && (
                  <p className={cn(typography.bodySmall, "text-muted-foreground")}>
                    {profile.phone_number}
                  </p>
                )}
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
