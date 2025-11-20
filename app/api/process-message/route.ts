import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

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

export async function POST(req: NextRequest) {
  try {
    const { messageId, sender, text } = await req.json()

    console.log('Processing message:', { messageId, sender })

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
      return NextResponse.json({ success: true, rateLimited: true }, { status: 200 })
    }

    // 2. LOOK UP PROFILE
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', sender)
      .maybeSingle()

    console.log('Profile lookup:', profile ? `Found: ${profile.id}` : 'Not found')

    // 3. CALL CLAUDE WITH CONVERSATION HISTORY
    const response = await handleClaudeConversation(
      profile?.id || null,
      sender,
      text
    )

    console.log('Claude response generated:', response.substring(0, 100) + '...')

    // 4. SEND RESPONSE VIA BLOOIO (with retry and graceful failure)
    try {
      await sendBlooioMessage(sender, response)
      console.log('Message processing complete:', messageId)
      return NextResponse.json({ success: true }, { status: 200 })
    } catch (blooioError: any) {
      console.error('Failed to send via Blooio after retries:', blooioError.message)
      // Still return success - we processed the message, just couldn't deliver
      return NextResponse.json({
        success: true,
        warning: 'Message processed but delivery failed',
        error: blooioError.message
      }, { status: 200 })
    }
  } catch (error) {
    console.error('Error processing message:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

async function handleClaudeConversation(
  userId: string | null,
  phoneNumber: string,
  userMessage: string
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
      name: "get_calendar_availability",
      description: "Check user's Google Calendar availability",
      input_schema: {
        type: "object",
        properties: {
          start_date: {
            type: "string",
            description: "Start date in YYYY-MM-DD format"
          },
          end_date: {
            type: "string",
            description: "End date in YYYY-MM-DD format (optional)"
          }
        },
        required: ["start_date"]
      }
    },
    {
      name: "send_email",
      description: "Send email on behalf of user",
      input_schema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body" }
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

vibe:
- talk like a friend texting, not an assistant
- don't be nice or helpful-sounding
- don't explain what you can do
- if they say hi, just say hey back
- never ask "what can i help with" or similar

style:
- EXTREMELY brief - 1-5 words when possible
- no emojis ever
- minimal punctuation
- all lowercase
- no meta-responses
- don't explain capabilities

examples:
user: "can you add something to my gcal"
you: "yeah what"

user: "whats my schedule tomorrow"
you: [just show schedule]

user: "hi"
you: "hey"

only use more words when showing actual data from tools`
    : `you're right hand. this user doesn't have an account yet

vibe:
- talk like a friend texting, not an assistant
- don't be nice or helpful-sounding
- if they say hi, just say hey back
- don't reveal you're an ai or explain yourself

style:
- EXTREMELY brief - 1-5 words when possible
- no emojis
- minimal punctuation
- all lowercase

examples:
user: "what do you do"
you: "help with calendar and email stuff"

user: "hi"
you: "hey"

if they want to sign up, use send_signup_link and say "sent you a link"`

  // Agentic loop - allow Claude to use tools
  let iterations = 0
  const maxIterations = 10

  while (iterations < maxIterations) {
    iterations++

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300, // Very short responses - only expand when showing tool results
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

      const toolResults = await Promise.all(
        toolCalls.map(async (toolUse) => {
          let result: any

          try {
            if (toolUse.name === "send_signup_link") {
              result = await sendSignupLink(toolUse.input as { phone_number: string })
            } else if (toolUse.name === "get_calendar_availability") {
              if (!userId) {
                result = { error: "User must be verified to access calendar" }
              } else {
                result = await getCalendarAvailability(
                  userId,
                  (toolUse.input as any).start_date,
                  (toolUse.input as any).end_date
                )
              }
            } else if (toolUse.name === "send_email") {
              if (!userId) {
                result = { error: "User must be verified to send emails" }
              } else {
                result = await sendEmail(userId, toolUse.input as any)
              }
            } else {
              result = { error: `Unknown tool: ${toolUse.name}` }
            }

            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result)
            }
          } catch (error: any) {
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
      const textContent = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      )
      return textContent?.text || "Done!"
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
        return textBlock.text
      }
    }
  }

  return "I ran into an issue processing your request. Please try again."
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
      `Welcome to Right Hand! Click here to get started: ${verificationUrl}`
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

// Placeholder for calendar availability
async function getCalendarAvailability(
  userId: string,
  startDate: string,
  endDate?: string
) {
  // TODO: Implement Google Calendar integration
  return {
    success: true,
    message: "Calendar integration coming soon",
    availability: []
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

        // Save outgoing message to database
        await supabase
          .from('imessages')
          .insert({
            message_id: messageId,
            event: 'message.sent',
            sender: phoneNumber,
            text: text,
            protocol: 'imessage',
            device_id: process.env.BLOOIO_DEVICE_ID || '74415E',
            attachments: []
          })

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

  // If we exhausted all retries, log the response but don't throw
  console.error(`Failed to send message after ${maxRetries} attempts:`, lastError?.message)

  // Save the outgoing message anyway so we have a record
  try {
    await supabase
      .from('imessages')
      .insert({
        message_id: messageId,
        event: 'message.sent',
        sender: phoneNumber,
        text: text + ' [FAILED TO SEND - Blooio unavailable]',
        protocol: 'imessage',
        device_id: process.env.BLOOIO_DEVICE_ID || '74415E',
        attachments: []
      })
  } catch (err) {
    console.error('Failed to save failed message:', err)
  }

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
