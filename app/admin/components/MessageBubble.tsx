/**
 * app/admin/components/MessageBubble.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { cn } from "@/lib/utils"
import { styles } from "../styles"
import { formatTime } from "../utils"
import type { Message } from "../types"

interface MessageBubbleProps {
  message: Message
}

/**
 * MessageBubble
 * imessage-style chat bubble with timestamp.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isSent = message.event === 'message.sent'

  return (
    <div className={cn("flex", isSent ? "justify-end" : "justify-start")}>
      <div className={cn(styles.messageBubble, isSent ? styles.messageSent : styles.messageReceived)}>
        <p className={isSent ? styles.messageTextSent : styles.messageTextReceived}>
          {message.text || message.content}
        </p>
        <p className={isSent ? styles.messageTimeSent : styles.messageTimeReceived}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
