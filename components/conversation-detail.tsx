"use client"

import * as React from "react"
import { ArrowLeft, User, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/components/conversations-table"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface ConversationDetailProps {
  conversation: Conversation
  onBack: () => void
}

// Mock messages - replace with actual data from your API
const getConversationMessages = (conversationId: string): Message[] => [
  {
    id: "1",
    role: "user",
    content: "Hi, I need help planning the Q4 strategy review meeting.",
    timestamp: "10:30 AM",
  },
  {
    id: "2",
    role: "assistant",
    content: "I'd be happy to help you plan the Q4 strategy review meeting. I can assist with scheduling, preparing the agenda, and coordinating with attendees. What specific aspects would you like to start with?",
    timestamp: "10:31 AM",
  },
  {
    id: "3",
    role: "user",
    content: "Let's start with the agenda. I want to cover revenue performance, key initiatives, and goals for next quarter.",
    timestamp: "10:35 AM",
  },
  {
    id: "4",
    role: "assistant",
    content: "Excellent. Here's a suggested agenda structure:\n\n1. Q4 Revenue Performance Review (20 min)\n   - Year-over-year comparison\n   - Key metrics and KPIs\n\n2. Key Initiatives & Accomplishments (30 min)\n   - Major projects completed\n   - Lessons learned\n\n3. Q1 Goals & Strategic Priorities (25 min)\n   - Proposed objectives\n   - Resource allocation\n\n4. Q&A and Discussion (15 min)\n\nWould you like me to adjust the timing or add any other topics?",
    timestamp: "10:36 AM",
  },
  {
    id: "5",
    role: "user",
    content: "This looks great! Let's schedule a meeting for next week. I need to include the executive team.",
    timestamp: "10:40 AM",
  },
  {
    id: "6",
    role: "assistant",
    content: "Perfect! I'll help coordinate with the executive team. I'll need to check everyone's availability. What days work best for you next week, and what time would you prefer?",
    timestamp: "10:41 AM",
  },
]

export function ConversationDetail({ conversation, onBack }: ConversationDetailProps) {
  const messages = getConversationMessages(conversation.id)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div className="flex-1">
          <h1 className={cn(typography.h4)}>{conversation.subject}</h1>
          <p className={cn(typography.bodySmall, "text-muted-foreground")}>
            {conversation.member} • {conversation.status}
          </p>
        </div>
      </div>

      {/* Messages Container - Claude-inspired */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto space-y-6 px-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4",
                message.role === "assistant" ? "items-start" : "items-start"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
                  message.role === "assistant"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.role === "assistant" ? (
                  <Bot className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn(typography.label)}>
                    {message.role === "assistant" ? "Right Hand" : conversation.member}
                  </span>
                  <span className={cn(typography.caption)}>{message.timestamp}</span>
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
        </div>
      </div>

      {/* Input Area - Optional placeholder */}
      <div className="border-t pt-4">
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
