import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getConversationHistory(
  phoneNumber: string,
  currentMessage: string
): Promise<Anthropic.MessageParam[]> {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

  const { data: recentMessages } = await supabaseAdmin
    .from('imessages')
    .select('event, text, created_at')
    .eq('sender', phoneNumber)
    .gte('created_at', twelveHoursAgo)
    .order('created_at', { ascending: true })

  const messages: Anthropic.MessageParam[] = []

  if (recentMessages && recentMessages.length > 0) {
    for (const msg of recentMessages) {
      messages.push({
        role: msg.event === 'message.received' ? 'user' : 'assistant',
        content: msg.text || ''
      })
    }
  }

  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.content !== currentMessage) {
    messages.push({ role: 'user', content: currentMessage })
  }

  return messages
}
