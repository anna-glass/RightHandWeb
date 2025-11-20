import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '@/lib/google-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for Claude processing

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Track which messages are currently being processed (prevent duplicate processing)
const processingMessages = new Set<string>()

export async function POST(req: NextRequest) {
  try {
    const { messageId, sender, text } = await req.json()

    console.log('📨 Processing message:', { messageId, sender })

    // Check if this specific message is already being processed
    if (processingMessages.has(messageId)) {
      console.log('⚠️ Message already being processed, skipping duplicate:', messageId)
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 })
    }

    // Mark this message as being processed
    processingMessages.add(messageId)

    try {
      // Process the message (all the existing logic below)
      await processMessage(messageId, sender, text)
      return NextResponse.json({ success: true }, { status: 200 })
    } finally {
      // Always remove from processing set when done (even if error)
      processingMessages.delete(messageId)
    }
  } catch (error) {
    console.error('Error in POST handler:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

async function processMessage(messageId: string, sender: string, text: string) {

  // 1. RATE LIMITING - Check if user has exceeded 50 messages per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error: countError } = await supabase
    .from('imessages')
    .select('*', { count: 'exact', head: true })
    .eq('sender', sender)
    .eq('event', 'message.received')
    .gte('created_at', oneHourAgo)

  if (countError) {
    console.error('Error checking rate limit:', countError)
  }

  if (count && count >= 50) {
    console.log('Rate limit exceeded for:', sender)
    await sendBlooioMessage(
      sender,
      "You've reached the message limit for this hour. Please try again later!"
    )
    return
  }

  // 2. LOOK UP PROFILE
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, timezone')
    .eq('phone_number', sender)
    .maybeSingle()

  console.log('Profile lookup:', profile ? `Found: ${profile.id}` : 'Not found')

  // If no profile, check if there's a pending verification
  let hasPendingVerification = false
  if (!profile) {
    const { data: pendingVerification } = await supabase
      .from('pending_verifications')
      .select('verification_token')
      .eq('phone_number', sender)
      .maybeSingle()

    hasPendingVerification = !!pendingVerification
    console.log('Pending verification:', hasPendingVerification ? 'Found' : 'Not found')
  }

  // 3. CALL CLAUDE WITH CONVERSATION HISTORY
  const response = await handleClaudeConversation(
    profile?.id || null,
    sender,
    text,
    profile?.timezone || 'America/Los_Angeles',
    hasPendingVerification
  )

  console.log('Claude response generated:', response.substring(0, 100) + '...')

  // 4. SEND RESPONSE VIA BLOOIO (with retry and graceful failure)
  try {
    await sendBlooioMessage(sender, response)
    console.log('Message processing complete:', messageId)
  } catch (blooioError: any) {
    console.error('Failed to send via Blooio after retries:', blooioError.message)
    // Don't throw - we processed the message, just couldn't deliver
  }
}

async function handleClaudeConversation(
  userId: string | null,
  phoneNumber: string,
  userMessage: string,
  userTimezone: string = 'America/Los_Angeles',
  hasPendingVerification: boolean = false
): Promise<string> {
  // Load recent conversation history (last 12 hours, no message limit)
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

  const { data: recentMessages } = await supabase
    .from('imessages')
    .select('event, text, created_at')
    .eq('sender', phoneNumber)
    .gte('created_at', twelveHoursAgo)
    .order('created_at', { ascending: true })

  // Convert to Claude message format
  const messages: Anthropic.MessageParam[] = []

  if (recentMessages && recentMessages.length > 0) {
    for (const msg of recentMessages) {
      messages.push({
        role: msg.event === 'message.received' ? 'user' : 'assistant',
        content: msg.text || ''
      })
    }
  }

  // Add current message if not already included
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.content !== userMessage) {
    messages.push({
      role: 'user',
      content: userMessage
    })
  }

  // Define tools based on user verification status
  const baseTools: Anthropic.Tool[] = [
    {
      name: "send_signup_link",
      description: userId
        ? "Send a signup link (but user is already signed up, so you probably don't need this)"
        : "Send a signup/verification link to a new user. Only use when user expresses interest in signing up or using Right Hand's services.",
      input_schema: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "The user's phone number"
          }
        },
        required: ["phone_number"]
      }
    }
  ]

  const authenticatedTools: Anthropic.Tool[] = [
    {
      name: "get_calendar_events",
      description: "view calendar events for a date or date range",
      input_schema: {
        type: "object",
        properties: {
          start_date: {
            type: "string",
            description: "start date in YYYY-MM-DD format"
          },
          end_date: {
            type: "string",
            description: "end date in YYYY-MM-DD format (optional, defaults to same day)"
          }
        },
        required: ["start_date"]
      }
    },
    {
      name: "create_calendar_event",
      description: "create a new calendar event",
      input_schema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "event title/summary"
          },
          start: {
            type: "string",
            description: "start time as ISO datetime (e.g. 2025-01-20T14:00:00) or date (2025-01-20) for all-day"
          },
          end: {
            type: "string",
            description: "end time as ISO datetime or date"
          },
          description: {
            type: "string",
            description: "event description (optional)"
          },
          location: {
            type: "string",
            description: "event location (optional)"
          }
        },
        required: ["summary", "start", "end"]
      }
    },
    {
      name: "update_calendar_event",
      description: "update an existing calendar event",
      input_schema: {
        type: "object",
        properties: {
          event_id: {
            type: "string",
            description: "id of the event to update"
          },
          summary: {
            type: "string",
            description: "new event title (optional)"
          },
          start: {
            type: "string",
            description: "new start time (optional)"
          },
          end: {
            type: "string",
            description: "new end time (optional)"
          },
          description: {
            type: "string",
            description: "new description (optional)"
          },
          location: {
            type: "string",
            description: "new location (optional)"
          }
        },
        required: ["event_id"]
      }
    },
    {
      name: "delete_calendar_event",
      description: "delete a calendar event",
      input_schema: {
        type: "object",
        properties: {
          event_id: {
            type: "string",
            description: "id of the event to delete"
          }
        },
        required: ["event_id"]
      }
    },
    {
      name: "send_email",
      description: "send email on behalf of user",
      input_schema: {
        type: "object",
        properties: {
          to: { type: "string", description: "recipient email" },
          subject: { type: "string", description: "email subject" },
          body: { type: "string", description: "email body" }
        },
        required: ["to", "subject", "body"]
      }
    }
  ]

  const tools = userId
    ? [...baseTools, ...authenticatedTools]
    : baseTools

  const systemPrompt = userId
    ? `you're right hand. you have access to the user's calendar and email

current date/time: ${new Date().toLocaleString('en-US', { timeZone: userTimezone, dateStyle: 'full', timeStyle: 'short' })}
timezone: ${userTimezone}

CRITICAL RULES:
- you MUST use tools to actually do things. NEVER pretend or role-play
- if they ask to ADD calendar event, USE create_calendar_event tool
- if they ask to VIEW calendar, USE get_calendar_events tool
- if they ask to MOVE/CHANGE event time, USE get_calendar_events to find it, THEN update_calendar_event
- if they ask to DELETE event, USE delete_calendar_event
- NEVER say "done" or "added it" unless you actually called the tool

when user says "move X to Y time":
1. call get_calendar_events to find the event matching X
2. call update_calendar_event with the event_id and new time
3. do NOT create a new event

NEVER BREAK CHARACTER:
- NEVER use numbered lists (1. 2. 3.)
- NEVER say "would you like me to" or "i can help you"
- NEVER be formal or overly helpful
- even when asking for clarification, stay casual and brief
- no explaining options or being verbose

vibe:
- talk like a friend texting, not an assistant
- don't be nice or helpful-sounding
- don't explain what you can do
- if they say hi, just say hey back
- never ask "what can i help with" or similar

style:
- brief and casual like texting a friend
- no emojis ever
- minimal punctuation
- all lowercase
- no meta-responses
- keep responses short but natural

examples:
user: "can you add something to my gcal"
you: "yeah what"

user: "add lunch meeting tomorrow 1pm"
you: [USE create_calendar_event tool, THEN say] "added"

user: "whats my schedule tomorrow"
you: [USE get_calendar_events tool, THEN show the events]

user: "add coffee with mom at 9am" (but there's already a 9am hair appointment)
you: "that conflicts with your hair appointment, what do you want to do"
NOT: numbered lists, NOT "would you like me to", NOT explaining options

user: "move coffee to 7am"
you: [USE get_calendar_events to find coffee event, USE update_calendar_event with event_id, THEN say] "moved to 7am"
NOT: create a new event, that leaves duplicates

user: "hi"
you: "hey"

NEVER use numbered lists, NEVER say "would you like me to", NEVER be formal or overly helpful even when asking for clarification. stay casual and brief always.`
    : `you're right hand. this user doesn't have an account yet

current date/time: ${new Date().toLocaleString('en-US', { timeZone: userTimezone, dateStyle: 'full', timeStyle: 'short' })}
their phone number: ${phoneNumber}
${hasPendingVerification ? 'IMPORTANT: you already sent them a signup link. remind them to click it instead of sending another one.' : 'IMPORTANT: this user needs to sign up to use calendar/email features. mention this casually in your response.'}

vibe:
- talk like a friend texting, not an assistant
- don't be pushy about signup, just mention it casually
- if they say hi, say hey and mention signup
- don't reveal you're an ai or explain yourself

style:
- brief and casual
- no emojis
- minimal punctuation
- all lowercase

examples:
${hasPendingVerification ? `
user: "hi"
you: "hey, did you click the link i sent?"

user: "can you help with my calendar"
you: "you need to click the signup link first"

user: "i lost it" or "send it again"
you: [USE send_signup_link tool with phone_number: ${phoneNumber}, THEN say] "sent it again"
` : `
user: "hi"
you: "hey, want to sign up?"

user: "what do you do"
you: "help with calendar and email stuff. want to sign up?"

user: "yeah sign me up" or "sure"
you: [USE send_signup_link tool with phone_number: ${phoneNumber}, THEN say] "sent you a link"
`}
DO NOT ask for their phone number - you already have it`

  // Agentic loop - allow Claude to use tools
  let iterations = 0
  const maxIterations = 10

  while (iterations < maxIterations) {
    iterations++

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 512, // Enough room for natural responses without being verbose
      system: systemPrompt,
      tools: tools,
      messages: messages
    })

    // Add assistant's response to messages
    messages.push({
      role: "assistant",
      content: response.content
    })

    if (response.stop_reason === "tool_use") {
      const toolCalls = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      )

      console.log('🔧 Tool calls:', toolCalls.map(t => t.name).join(', '))

      const toolResults = await Promise.all(
        toolCalls.map(async (toolUse) => {
          console.log(`Calling tool: ${toolUse.name}`, JSON.stringify(toolUse.input, null, 2))
          let result: any

          try {
            if (toolUse.name === "send_signup_link") {
              result = await sendSignupLink(toolUse.input as { phone_number: string })
            } else if (toolUse.name === "get_calendar_events") {
              result = await getCalendarEvents(
                userId!,
                (toolUse.input as any).start_date,
                (toolUse.input as any).end_date
              )
            } else if (toolUse.name === "create_calendar_event") {
              result = await createCalendarEvent(userId!, toolUse.input as any)
            } else if (toolUse.name === "update_calendar_event") {
              const input = toolUse.input as any
              result = await updateCalendarEvent(userId!, input.event_id, {
                summary: input.summary,
                start: input.start,
                end: input.end,
                description: input.description,
                location: input.location
              })
            } else if (toolUse.name === "delete_calendar_event") {
              result = await deleteCalendarEvent(
                userId!,
                (toolUse.input as any).event_id
              )
            } else if (toolUse.name === "send_email") {
              result = await sendEmail(userId!, toolUse.input as any)
            } else {
              result = { error: `unknown tool: ${toolUse.name}` }
            }

            console.log(`✅ Tool result for ${toolUse.name}:`, JSON.stringify(result, null, 2))
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result)
            }
          } catch (error: any) {
            console.error(`❌ Tool error for ${toolUse.name}:`, error.message)
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: error.message }),
              is_error: true
            }
          }
        })
      )

      messages.push({
        role: "user",
        content: toolResults
      })

    } else if (response.stop_reason === "end_turn") {
      // Get first text block only
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      )

      if (textBlock) {
        let text = textBlock.text.trim()

        // Debug: check if there are multiple text blocks
        const allTextBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === "text"
        )
        if (allTextBlocks.length > 1) {
          console.warn('WARNING: Multiple text blocks detected!', allTextBlocks.length)
          allTextBlocks.forEach((block, i) => {
            console.log(`Block ${i}:`, block.text.substring(0, 50))
          })
        }

        // Deduplicate: Check if entire text is duplicated (e.g. "hello hello")
        const words = text.split(/\s+/)
        const halfLength = Math.floor(words.length / 2)

        if (words.length > 1 && words.length % 2 === 0) {
          const firstHalf = words.slice(0, halfLength).join(' ')
          const secondHalf = words.slice(halfLength).join(' ')

          if (firstHalf === secondHalf) {
            console.warn('⚠️ Exact duplicate detected and removed')
            text = firstHalf
          }
        }
        console.log('Claude response:', text.substring(0, 100))
        console.log('Total response blocks:', response.content.length)

        return text || "..."
      }

      return "..."
    } else {
      break
    }
  }

  // If we exit the loop without returning, extract the last text content
  const lastAssistantMessage = messages[messages.length - 1]
  if (lastAssistantMessage && lastAssistantMessage.role === 'assistant') {
    const content = lastAssistantMessage.content
    if (Array.isArray(content)) {
      const textBlock = content.find((block: any) => block.type === "text")
      if (textBlock && 'text' in textBlock) {
        let text = textBlock.text.trim()

        // Deduplicate here too
        const words = text.split(/\s+/)
        const halfLength = Math.floor(words.length / 2)

        if (words.length > 1 && words.length % 2 === 0) {
          const firstHalf = words.slice(0, halfLength).join(' ')
          const secondHalf = words.slice(halfLength).join(' ')

          if (firstHalf === secondHalf) {
            text = firstHalf
          }
        }

        return text || "..."
      }
    }
  }

  return "..."
}

// Helper function to send signup link
async function sendSignupLink(input: { phone_number: string }) {
  const { phone_number } = input
  const verificationToken = generateVerificationToken(10)

  // Check if there's already a pending verification for this phone number
  const { data: existing } = await supabase
    .from('pending_verifications')
    .select('verification_token')
    .eq('phone_number', phone_number)
    .maybeSingle()

  const tokenToUse = existing?.verification_token || verificationToken

  // Insert if it doesn't exist
  if (!existing) {
    const { error } = await supabase
      .from('pending_verifications')
      .insert({
        phone_number: phone_number,
        verification_token: verificationToken,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error creating verification:', error)
      throw new Error('Failed to create signup link')
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const verificationUrl = `${baseUrl}/verify/${tokenToUse}`

  // Send the verification link via Blooio
  try {
    await sendBlooioMessage(
      phone_number,
      verificationUrl
    )

    return {
      success: true,
      message: "Signup link sent successfully",
      url: verificationUrl
    }
  } catch (error) {
    console.error('Failed to send signup link:', error)
    throw error
  }
}

// Placeholder for sending email
async function sendEmail(
  userId: string,
  input: { to: string; subject: string; body: string }
) {
  // TODO: Implement Gmail integration
  return {
    success: true,
    message: "Email integration coming soon"
  }
}

// Helper function to send Blooio message with retry logic
async function sendBlooioMessage(phoneNumber: string, text: string, maxRetries: number = 5) {
  const messageId = generateMessageId()

  console.log('📤 sendBlooioMessage called:', {
    messageId,
    phoneNumber,
    textPreview: text.substring(0, 50)
  })

  let attempt = 0
  let lastError: Error | null = null

  while (attempt < maxRetries) {
    attempt++

    try {
      console.log(`Attempting to send message (${attempt}/${maxRetries})`)

      const res = await fetch('https://backend.blooio.com/v1/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BLOOIO_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `msg-${messageId}-${attempt}`
        },
        body: JSON.stringify({
          to: phoneNumber,
          text: text
        })
      })

      if (res.ok) {
        const data = await res.json()
        console.log('Blooio message sent successfully:', data)
        // Note: Webhook will save this message when Blooio fires message.sent event
        return data
      }

      const errorText = await res.text()
      console.error(`Blooio API error (attempt ${attempt}):`, res.status, errorText)

      // Don't retry client errors (400, 401, 403, 404) except 503
      if (res.status >= 400 && res.status < 500 && res.status !== 503) {
        throw new Error(`Non-retryable Blooio error: ${res.status} - ${errorText}`)
      }

      // For 503 (device unavailable), retry with shorter backoff
      if (res.status === 503) {
        lastError = new Error(`Blooio device unavailable: ${errorText}`)
        if (attempt < maxRetries) {
          // Shorter backoff for device issues (maybe devices will come back online)
          const backoffMs = Math.min(500 * attempt, 3000)
          console.log(`Device unavailable, waiting ${backoffMs}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, backoffMs))
        }
        continue
      }

      // For other 5xx errors, use exponential backoff
      lastError = new Error(`Blooio API error: ${res.status} - ${errorText}`)

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * 2 ** attempt, 10000)
        console.log(`Waiting ${backoffMs}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }

    } catch (error: any) {
      console.error(`Error on attempt ${attempt}:`, error.message)
      lastError = error

      // If it's a non-retryable error, throw immediately
      if (error.message?.includes('Non-retryable')) {
        throw error
      }

      // Otherwise retry if we have attempts left
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * 2 ** attempt, 10000)
        console.log(`Waiting ${backoffMs}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }
    }
  }

  // If we exhausted all retries, throw error
  console.error(`Failed to send message after ${maxRetries} attempts:`, lastError?.message)
  throw lastError || new Error('Failed to send message')
}

// Helper to generate verification token
function generateVerificationToken(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// Helper to generate message ID
function generateMessageId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 21; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}
