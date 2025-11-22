import Anthropic from '@anthropic-ai/sdk'
import { getRecentMessages } from '@/lib/db'

export async function getConversationHistory(
  phoneNumber: string,
  currentMessage: string
): Promise<Anthropic.MessageParam[]> {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const recentMessages = await getRecentMessages(phoneNumber, twelveHoursAgo)

  const messages: Anthropic.MessageParam[] = recentMessages.map(msg => ({
    role: msg.event === 'message.received' ? 'user' : 'assistant',
    content: msg.text || ''
  }))

  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.content !== currentMessage) {
    messages.push({ role: 'user', content: currentMessage })
  }

  return messages
}
