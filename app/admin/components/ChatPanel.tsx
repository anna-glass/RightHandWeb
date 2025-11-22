/**
 * app/admin/components/ChatPanel.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { styles } from "../styles"
import { ChatHeader } from "./ChatHeader"
import { MessageBubble } from "./MessageBubble"
import { MessageInput } from "./MessageInput"
import type { UserProfile, Message } from "../types"

interface ChatPanelProps {
  user: UserProfile | null
  messages: Message[]
}

/**
 * ChatPanel
 * main chat area with messages, header, and input.
 */
export function ChatPanel({ user, messages }: ChatPanelProps) {
  if (!user) {
    return (
      <div className={styles.chatPanel}>
        <div className="flex items-center justify-center h-full">
          <p className={cn(typography.body, "text-muted-foreground")}>
            No user data available
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.chatPanel}>
      <div className={styles.messagesContainer}>
        <div className={styles.messagesContent}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className={cn(typography.body, "text-muted-foreground")}>
                No messages yet
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble key={message.message_id || index} message={message} />
            ))
          )}
        </div>
      </div>
      <ChatHeader user={user} />
      <MessageInput />
    </div>
  )
}
