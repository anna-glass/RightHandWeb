/**
 * app/api/process-message/route.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClaudeResponse, RATE_LIMIT_MESSAGE } from '@/lib/claude'
import { getSystemPrompt } from '@/lib/system-prompts'
import { sendiMessage, markAsRead, startTyping, stopTyping } from '@/lib/iMessage'
import { generateMessageId } from '@/lib/helpers'
import { getTools } from '@/lib/tools'
import { isRateLimited } from '@/lib/rate-limit'
import { getConversationHistory } from '@/lib/conversation'
import { getProfileByPhone } from '@/lib/db'
import { handleSendSignupLink } from '@/lib/handlers/signup'

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
  console.log(`🌲 message received from ${sender}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`)

  await Promise.all([markAsRead(sender), startTyping(sender)])
  console.log(`🌲 marked as read and started typing`)

  if (await isRateLimited(sender)) {
    console.log(`🌲 rate limited, aborting`)
    await stopTyping(sender)
    await sendiMessage(sender, RATE_LIMIT_MESSAGE, generateMessageId())
    return
  }
  console.log(`🌲 rate limit check passed`)

  const profile = await getProfileByPhone(sender)
  console.log(`🌲 profile lookup complete - authenticated: ${!!profile}`)

  // unauthenticated users get signup link immediately, no claude
  if (!profile) {
    console.log(`🌲 sending signup link to unauthenticated user`)
    await stopTyping(sender)

    try {
      const result = await handleSendSignupLink({ phone_number: sender })
      console.log(`🌲 signup link sent: ${result.url}`)
      await sendiMessage(sender, "hey! so glad you're here. sign up with this link:", generateMessageId())
    } catch (error) {
      console.error('🌲 error sending signup link:', error)
      await sendiMessage(sender, "oops, something went wrong. text me again?", generateMessageId())
    }

    console.log(`🌲 message processing complete`)
    return
  }

  // authenticated users get claude
  const userId = profile.id
  const userTimezone = profile.timezone || 'America/Los_Angeles'
  const userName = profile.first_name || 'User'
  const userCity = profile.city || null

  const messages = await getConversationHistory(sender, text)
  console.log(`🌲 conversation history fetched - ${messages.length} messages`)

  const tools = getTools(true)
  const systemPrompt = getSystemPrompt(userTimezone, userName, userCity)

  console.log(`🌲 calling claude with ${tools.length} tools available`)
  const response = await getClaudeResponse(
    systemPrompt,
    messages,
    tools,
    { userId, phoneNumber: sender, userTimezone }
  )
  console.log(`🌲 claude response complete`)

  await stopTyping(sender)

  try {
    await sendiMessage(sender, response, generateMessageId())
    console.log(`🌲 message sent`)
  } catch {}

  console.log(`🌲 message processing complete`)
}
