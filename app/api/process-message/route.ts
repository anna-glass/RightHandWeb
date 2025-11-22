import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getClaudeResponse, RATE_LIMIT_MESSAGE } from '@/lib/claude'
import { getAuthenticatedSystemPrompt, getUnauthenticatedSystemPrompt } from '@/lib/system-prompts'
import { sendiMessage, markAsRead, startTyping, stopTyping } from '@/lib/iMessage'
import { generateMessageId } from '@/lib/helpers'
import { getTools } from '@/lib/tools'
import { isRateLimited } from '@/lib/rate-limit'
import { getConversationHistory } from '@/lib/conversation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// deduplication for concurrent requests with same message_id
const processingMessages = new Set<string>()

/**
 * POST /api/process-message
 * main entry point for incoming SMS messages from blooio webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const { messageId, sender, text } = await req.json()

    // skip duplicate messages
    if (processingMessages.has(messageId)) {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 })
    }

    processingMessages.add(messageId)

    try {
      await processMessage(sender, text)
      return NextResponse.json({ success: true }, { status: 200 })
    } finally {
      processingMessages.delete(messageId)
    }
  } catch (error) {
    console.error('Error in POST handler:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

/** Handles the full message flow: rate limit check, claude response, sms reply. */
async function processMessage(sender: string, text: string) {
  await Promise.all([markAsRead(sender), startTyping(sender)])

  if (await isRateLimited(sender)) {
    await stopTyping(sender)
    await sendiMessage(sender, RATE_LIMIT_MESSAGE, generateMessageId())
    return
  }

  // fetch user profile if they exist
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, timezone, first_name, last_name, city')
    .eq('phone_number', sender)
    .maybeSingle()

  // check for pending signup if no profile
  let hasPendingVerification = false
  if (!profile) {
    const { data: pendingVerification } = await supabaseAdmin
      .from('pending_verifications')
      .select('verification_token')
      .eq('phone_number', sender)
      .maybeSingle()
    hasPendingVerification = !!pendingVerification
  }

  const userId = profile?.id || null
  const userTimezone = profile?.timezone || 'America/Los_Angeles'
  const userName = profile?.first_name || 'User'
  const userCity = profile?.city || null

  // build claude context based on auth state
  const messages = await getConversationHistory(sender, text)
  const tools = getTools(!!userId)
  const systemPrompt = userId
    ? getAuthenticatedSystemPrompt(userTimezone, userName, userCity)
    : getUnauthenticatedSystemPrompt(sender, userTimezone, hasPendingVerification)

  const response = await getClaudeResponse(
    systemPrompt,
    messages,
    tools,
    { userId, phoneNumber: sender, userTimezone }
  )

  await stopTyping(sender)

  try {
    await sendiMessage(sender, response, generateMessageId())
  } catch {}
}
