"use client"

import * as React from "react"
import { ArrowRight, Plus, CheckCircle2, ChevronDown, X, MessageSquarePlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"
import {
  useMessages,
  useTasks,
  useProfile,
  createMessage,
  createTask,
  updateTask,
  deleteTask
} from "@/lib/supabase/hooks"
import { createClient } from "@/lib/supabase/browser"

type Profile = Database['public']['Tables']['profiles']['Row']
type Message = Database['public']['Tables']['messages']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface ChatsViewProps {
  selectedUserId: string
  onUserChange: (userId: string) => void
  profiles: Profile[]
}

function formatTime(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function ChatsView({ selectedUserId, onUserChange, profiles }: ChatsViewProps) {
  const { messages, loading, error } = useMessages(selectedUserId)
  const { tasks, loading: tasksLoading } = useTasks(selectedUserId)
  const { profile } = useProfile(selectedUserId)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [newMessage, setNewMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [optimisticMessages, setOptimisticMessages] = React.useState<Message[]>([])
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const [creatingTask, setCreatingTask] = React.useState(false)
  const [showNewTaskInput, setShowNewTaskInput] = React.useState(false)
  const [taskUpdateId, setTaskUpdateId] = React.useState<string | null>(null)
  const [taskUpdateText, setTaskUpdateText] = React.useState("")
  const [addingUpdate, setAddingUpdate] = React.useState(false)
  const [lastMessagesByUser, setLastMessagesByUser] = React.useState<Map<string, Message>>(new Map())

  const memberName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'User'
    : 'User'
  const profilePicture = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUserId}`

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    const optimisticId = `optimistic-${Date.now()}`

    // Create optimistic message
    const optimisticMessage: Message = {
      id: optimisticId,
      user_id: selectedUserId,
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
        user_id: selectedUserId,
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
        user_id: selectedUserId,
        title: newTaskTitle.trim(),
        status: 'open'
      })
      setNewTaskTitle("")
      setShowNewTaskInput(false)
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

  const handleCancelTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to cancel this task? This action cannot be undone.')) {
      return
    }

    try {
      await deleteTask(taskId)
    } catch (err) {
      console.error('Error canceling task:', err)
      alert('Failed to cancel task. Please try again.')
    }
  }

  const handleAddTaskUpdate = async (task: Task) => {
    if (!taskUpdateText.trim() || addingUpdate) return

    try {
      setAddingUpdate(true)
      const currentUpdates = task.status_updates || []
      const newUpdates = [...currentUpdates, taskUpdateText.trim()]

      await updateTask(task.id, { status_updates: newUpdates })

      setTaskUpdateText("")
      setTaskUpdateId(null)
    } catch (err) {
      console.error('Error adding task update:', err)
      alert('Failed to add task update. Please try again.')
    } finally {
      setAddingUpdate(false)
    }
  }

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

  // Fetch last message for each user to determine who needs a response
  React.useEffect(() => {
    async function fetchLastMessages() {
      const supabase = createClient()
      const lastMessages = new Map<string, Message>()

      try {
        for (const profile of profiles) {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)

          if (!error && data && data.length > 0) {
            lastMessages.set(profile.id, data[0])
          }
        }
        setLastMessagesByUser(lastMessages)
      } catch (err) {
        console.error('Error fetching last messages:', err)
      }
    }

    fetchLastMessages()
  }, [profiles, messages]) // Re-fetch when messages change

  const openTasks = tasks.filter(t => t.status === 'open')

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header with User Dropdown */}
      <div className="flex items-center justify-between pb-4 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-lg font-medium">
              <img
                src={profilePicture}
                alt={memberName}
                className="w-8 h-8 rounded-md bg-muted object-cover"
              />
              <span>{memberName}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {profiles.map((p) => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'User'
              const lastMessage = lastMessagesByUser.get(p.id)
              const needsResponse = lastMessage?.sender === 'user'

              return (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => onUserChange(p.id)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    p.id === selectedUserId && "bg-muted"
                  )}
                >
                  <div className="relative">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={name}
                        className="w-6 h-6 rounded-md bg-muted object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-muted" />
                    )}
                    {needsResponse && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border border-background" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{name}</div>
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{openTasks.length} open tasks</Badge>
        </div>
      </div>

      {/* Task Actions Bar */}
      <div className="flex items-center gap-2 py-3 border-b bg-muted/30 px-4">
        {showNewTaskInput ? (
          <div className="flex gap-2 flex-1">
            <Input
              type="text"
              placeholder="New task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreateTask()
                } else if (e.key === 'Escape') {
                  setShowNewTaskInput(false)
                  setNewTaskTitle("")
                }
              }}
              disabled={creatingTask}
              className="flex-1 h-8"
              autoFocus
            />
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || creatingTask}
              size="sm"
              className="h-8"
            >
              Add
            </Button>
            <Button
              onClick={() => {
                setShowNewTaskInput(false)
                setNewTaskTitle("")
              }}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <Button
              onClick={() => setShowNewTaskInput(true)}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Task
            </Button>

            {tasksLoading ? (
              <span className={cn(typography.bodySmall, "text-muted-foreground")}>Loading tasks...</span>
            ) : openTasks.length === 0 ? (
              <span className={cn(typography.bodySmall, "text-muted-foreground")}>No open tasks</span>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {openTasks.map((task) => (
                  taskUpdateId === task.id ? (
                    <div key={task.id} className="flex gap-2 items-center">
                      <Input
                        type="text"
                        placeholder="Add status update..."
                        value={taskUpdateText}
                        onChange={(e) => setTaskUpdateText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTaskUpdate(task)
                          } else if (e.key === 'Escape') {
                            setTaskUpdateId(null)
                            setTaskUpdateText("")
                          }
                        }}
                        disabled={addingUpdate}
                        className="h-8"
                        autoFocus
                      />
                      <Button
                        onClick={() => handleAddTaskUpdate(task)}
                        disabled={!taskUpdateText.trim() || addingUpdate}
                        size="sm"
                        className="h-8"
                      >
                        Add
                      </Button>
                      <Button
                        onClick={() => {
                          setTaskUpdateId(null)
                          setTaskUpdateText("")
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <DropdownMenu key={task.id}>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 bg-background border rounded-md px-3 py-1 hover:bg-muted/50 transition-colors">
                          <span className={cn(typography.bodySmall)}>{task.title}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleToggleTaskStatus(task)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTaskUpdateId(task.id)}>
                          <MessageSquarePlus className="h-4 w-4 mr-2" />
                          Add Update
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCancelTask(task.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Messages Area - Full Width */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex-1" />
        <div className="w-full max-w-4xl mx-auto space-y-6 px-6 py-4">
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
                    <div className="flex gap-4 items-start max-w-[70%] bg-muted p-4 rounded-lg">
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
                    <div className="flex gap-4 items-start max-w-[70%]">
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
        <div className="w-full max-w-4xl mx-auto px-6">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Type a message as Right Hand..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1 bg-white"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
