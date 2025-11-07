"use client"

import * as React from "react"
import { User, Bot } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/components/conversations-table"
import { useMessages } from "@/lib/supabase/hooks"

interface ConversationDetailProps {
  conversation: Conversation
  onBack: () => void
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function ConversationDetail({ conversation, onBack }: ConversationDetailProps) {
  const { messages, loading, error } = useMessages(conversation.id)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const memberName = conversation.profile
    ? [conversation.profile.first_name, conversation.profile.last_name].filter(Boolean).join(' ') || 'User'
    : 'User'

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
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

      {/* Messages Container - Claude-inspired */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6 px-4">
          {loading ? (
            <div className="text-center py-8">
              <p className={cn(typography.body, "text-muted-foreground")}>Loading messages...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className={cn(typography.body, "text-destructive")}>Error loading messages: {error.message}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className={cn(typography.body, "text-muted-foreground")}>No messages yet</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.sender === "assistant" ? "items-start" : "items-start"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
                      message.sender === "assistant"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.sender === "assistant" ? (
                      <Bot className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(typography.label)}>
                        {message.sender === "assistant" ? "Right Hand" : memberName}
                      </span>
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
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area - Optional placeholder */}
      <div className="border-t pt-4 pb-2">
        <div className="max-w-3xl mx-auto px-4">
          <div className={cn(
            "w-full p-3 rounded-lg border bg-muted/50",
            typography.bodySmall,
            "text-muted-foreground"
          )}>
            Conversation view (read-only)
          </div>
        </div>
      </div>
    </div>
  )
}
