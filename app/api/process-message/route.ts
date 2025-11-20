import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '@/lib/google-calendar'
import {
  sendEmail as sendGmailEmail,
  getRecentEmails,
  searchEmails,
  createDraft,
  updateDraft,
  sendDraft
} from '@/lib/gmail'
import { getAuthenticatedSystemPrompt, getUnauthenticatedSystemPrompt } from '@/lib/system-prompts'

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
    .select('id, timezone, first_name, last_name')
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
  const userName = profile?.first_name || 'User'
  const response = await handleClaudeConversation(
    profile?.id || null,
    sender,
    text,
    profile?.timezone || 'America/Los_Angeles',
    hasPendingVerification,
    userName
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
  hasPendingVerification: boolean = false,
  userName: string = 'User'
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
      description: "create a new calendar event with optional attendees. can invite people by email",
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
          },
          attendees: {
            type: "string",
            description: "comma-separated list of attendee email addresses who will receive calendar invites (optional). example: 'alice@example.com,bob@example.com'"
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
          },
          attendees: {
            type: "string",
            description: "comma-separated list of attendee email addresses (optional). replaces existing attendees. empty string removes all attendees"
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
      name: "create_email_draft",
      description: "REQUIRED FIRST STEP for sending emails. creates an email draft in Gmail. you MUST call this tool before showing any draft to the user. do not skip this step. parameters: to (email), subject, body, optional cc/bcc",
      input_schema: {
        type: "object",
        properties: {
          to: { type: "string", description: "recipient email address" },
          subject: { type: "string", description: "email subject line" },
          body: { type: "string", description: "email body text" },
          cc: { type: "string", description: "cc email addresses (optional)" },
          bcc: { type: "string", description: "bcc email addresses (optional)" }
        },
        required: ["to", "subject", "body"]
      }
    },
    {
      name: "send_pending_draft",
      description: "send the most recent pending email draft. only use AFTER create_email_draft and user confirms. if recipient specified, finds draft by recipient, otherwise sends most recent draft",
      input_schema: {
        type: "object",
        properties: {
          recipient: { type: "string", description: "email address to match (optional - if not provided, sends most recent draft)" }
        }
      }
    },
    {
      name: "update_pending_draft",
      description: "update the most recent pending email draft. use when user wants to edit the draft",
      input_schema: {
        type: "object",
        properties: {
          subject: { type: "string", description: "new subject (optional)" },
          body: { type: "string", description: "new body (optional)" },
          recipient: { type: "string", description: "email address to match specific draft (optional)" }
        }
      }
    },
    {
      name: "search_emails",
      description: "search for emails by person, subject, or content. use to find threads to reply to",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "search query (e.g. 'from:trisha@example.com' or 'subject:meeting')"
          },
          max_results: {
            type: "number",
            description: "max results (default 5)"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "get_recent_emails",
      description: "get recent emails from inbox",
      input_schema: {
        type: "object",
        properties: {
          max_results: {
            type: "number",
            description: "max number of emails to fetch (default 10)"
          }
        }
      }
    }
  ]

  const tools = userId
    ? [...baseTools, ...authenticatedTools]
    : baseTools

  const systemPrompt = userId
    ? getAuthenticatedSystemPrompt(userTimezone, userName)
    : getUnauthenticatedSystemPrompt(phoneNumber, userTimezone, hasPendingVerification)

  // Agentic loop - allow Claude to use tools
  let iterations = 0
  const maxIterations = 10

  while (iterations < maxIterations) {
    iterations++

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048, // Enough for full email drafts and tool use
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
                location: input.location,
                attendees: input.attendees
              })
            } else if (toolUse.name === "delete_calendar_event") {
              result = await deleteCalendarEvent(
                userId!,
                (toolUse.input as any).event_id
              )
            } else if (toolUse.name === "create_email_draft") {
              // Create Gmail draft and store in pending_email_drafts table
              const input = toolUse.input as any
              const draftResult = await createDraft(userId!, {
                to: input.to,
                subject: input.subject,
                body: input.body,
                cc: input.cc,
                bcc: input.bcc
              })

              if (draftResult.success) {
                // Store in pending_email_drafts table
                const { data, error: insertError } = await supabase
                  .from('pending_email_drafts')
                  .insert({
                    user_id: userId!,
                    gmail_draft_id: draftResult.draftId,
                    recipient: input.to,
                    subject: input.subject
                  })
                  .select()

                if (insertError) {
                  console.error('Error saving to pending_email_drafts:', insertError)
                  result = {
                    success: false,
                    error: `Draft created in Gmail but failed to save to database: ${insertError.message}`
                  }
                } else {
                  console.log('Draft saved to pending_email_drafts:', data)
                  result = {
                    success: true,
                    draftId: draftResult.draftId,
                    to: input.to,
                    subject: input.subject,
                    body: input.body,
                    message: "Draft created in Gmail. You MUST now show the user the complete draft in the format: 'to: [email]\\nsubject: [subject]\\nbody: [full body]\\n\\nsend it?' - DO NOT skip showing the draft details."
                  }
                }
              } else {
                result = draftResult
              }
            } else if (toolUse.name === "send_pending_draft") {
              // Find and send the pending draft
              const input = toolUse.input as any
              console.log('Looking for pending draft for user:', userId)

              let query = supabase
                .from('pending_email_drafts')
                .select('*')
                .eq('user_id', userId!)
                .order('created_at', { ascending: false })

              if (input?.recipient) {
                query = query.eq('recipient', input.recipient)
                console.log('Filtering by recipient:', input.recipient)
              }

              const { data: pendingDrafts, error: queryError } = await query.limit(1)

              if (queryError) {
                console.error('Error querying pending drafts:', queryError)
                result = {
                  success: false,
                  error: `Database error: ${queryError.message}`
                }
              } else if (pendingDrafts && pendingDrafts.length > 0) {
                const draft = pendingDrafts[0]
                console.log('Found pending draft:', draft.id, draft.gmail_draft_id)
                const sendResult = await sendDraft(userId!, draft.gmail_draft_id)

                if (sendResult.success) {
                  // Delete from pending_email_drafts
                  const { error: deleteError } = await supabase
                    .from('pending_email_drafts')
                    .delete()
                    .eq('id', draft.id)

                  if (deleteError) {
                    console.error('Error deleting draft from DB:', deleteError)
                  } else {
                    console.log('Deleted draft from pending_email_drafts:', draft.id)
                  }
                }

                result = sendResult
              } else {
                console.log('No pending drafts found')
                result = {
                  success: false,
                  error: 'no pending draft found - make sure you called create_email_draft first'
                }
              }
            } else if (toolUse.name === "update_pending_draft") {
              // Find and update the pending draft
              const input = toolUse.input as any
              let query = supabase
                .from('pending_email_drafts')
                .select('*')
                .eq('user_id', userId!)
                .order('created_at', { ascending: false })

              if (input?.recipient) {
                query = query.eq('recipient', input.recipient)
              }

              const { data: pendingDrafts } = await query.limit(1)

              if (pendingDrafts && pendingDrafts.length > 0) {
                const draft = pendingDrafts[0]
                const updateResult = await updateDraft(userId!, draft.gmail_draft_id, {
                  subject: input.subject,
                  body: input.body
                })

                if (updateResult.success && input.subject) {
                  // Update the subject in our table too
                  await supabase
                    .from('pending_email_drafts')
                    .update({ subject: input.subject })
                    .eq('id', draft.id)
                }

                result = updateResult
              } else {
                result = {
                  success: false,
                  error: 'no pending draft found'
                }
              }
            } else if (toolUse.name === "search_emails") {
              result = await searchEmails(userId!, toolUse.input as any)
            } else if (toolUse.name === "get_recent_emails") {
              result = await getRecentEmails(
                userId!,
                (toolUse.input as any)?.max_results || 10
              )
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

// Note: sendEmail is now imported from @/lib/gmail as sendGmailEmail

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
