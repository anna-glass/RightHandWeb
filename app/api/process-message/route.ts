import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Client as QstashClient } from '@upstash/qstash'
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '@/lib/google-calendar'
import {
  getRecentEmails,
  searchEmails,
  createDraft,
  updateDraft,
  sendDraft
} from '@/lib/gmail'
import { getAuthenticatedSystemPrompt, getUnauthenticatedSystemPrompt } from '@/lib/system-prompts'
import { formatPhoneNumberE164 } from '@/lib/phone-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for Claude processing

// Type definitions for tool inputs
interface SignupLinkInput {
  phone_number: string
}

interface CalendarEventsInput {
  start_date: string
  end_date?: string
}

interface CreateCalendarEventInput {
  summary: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: string
}

interface UpdateCalendarEventInput {
  event_id: string
  summary?: string
  start?: string
  end?: string
  description?: string
  location?: string
  attendees?: string
}

interface DeleteCalendarEventInput {
  event_id: string
}

interface CreateEmailDraftInput {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
}

interface SendPendingDraftInput {
  recipient?: string
}

interface UpdatePendingDraftInput {
  subject?: string
  body?: string
  recipient?: string
}

interface SearchEmailsInput {
  query: string
  max_results?: number
}

interface GetRecentEmailsInput {
  max_results?: number
}

interface CreateReminderInput {
  intent: string
  time: string
}

interface CancelReminderInput {
  reminder_id: string
}

interface CreateDigestInput {
  prompt: string
  time: string
  frequency: 'daily' | 'weekdays' | 'weekly'
  day_of_week?: number
}

interface DeleteDigestInput {
  digest_id: string
}

// Tool result types
interface ToolResult {
  success?: boolean
  error?: string
  message?: string
  [key: string]: unknown
}

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const qstash = new QstashClient({
  token: process.env.QSTASH_TOKEN!,
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
  } catch (blooioError: unknown) {
    const errorMessage = blooioError instanceof Error ? blooioError.message : String(blooioError)
    console.error('Failed to send via Blooio after retries:', errorMessage)
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
    },
    {
      name: "create_reminder",
      description: "create a reminder to notify the user at a specific time. use this when the user asks to be reminded about something",
      input_schema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            description: "craft a casual, fun message that will be sent directly to the user at reminder time. be direct and playful, like 'get off the couch!' or 'time to call mom!' - no need to say 'reminder' or be formal"
          },
          time: {
            type: "string",
            description: "when to send the reminder as ISO datetime (e.g. 2025-01-20T14:00:00)"
          }
        },
        required: ["intent", "time"]
      }
    },
    {
      name: "list_reminders",
      description: "list all pending reminders for the user. use when user asks what reminders they have or wants to see their scheduled reminders",
      input_schema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "cancel_reminder",
      description: "cancel a pending reminder. use when user wants to cancel or delete a reminder",
      input_schema: {
        type: "object",
        properties: {
          reminder_id: {
            type: "string",
            description: "id of the reminder to cancel (get from list_reminders)"
          }
        },
        required: ["reminder_id"]
      }
    },
    {
      name: "create_digest",
      description: "create a recurring digest that sends scheduled summaries. use when user wants daily/weekly updates like 'show me my events every morning' or 'weekly email summary'",
      input_schema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "what information to include in the digest (e.g. 'show me all my events today', 'summarize my emails from this week')"
          },
          time: {
            type: "string",
            description: "time to send in 24-hour format HH:MM in user's timezone (e.g. '07:00', '14:30', '18:45')"
          },
          frequency: {
            type: "string",
            description: "how often to send: 'daily', 'weekdays', or 'weekly'",
            enum: ["daily", "weekdays", "weekly"]
          },
          day_of_week: {
            type: "number",
            description: "for weekly digests only: day of week (0=Sunday, 1=Monday, ..., 6=Saturday). required if frequency is 'weekly'"
          }
        },
        required: ["prompt", "time", "frequency"]
      }
    },
    {
      name: "list_digests",
      description: "list all active digests for the user. use when user asks what digests they have or wants to see their scheduled digests",
      input_schema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "delete_digest",
      description: "delete/cancel a digest. use when user wants to stop receiving a digest or cancel a scheduled digest",
      input_schema: {
        type: "object",
        properties: {
          digest_id: {
            type: "string",
            description: "id of the digest to delete (get from list_digests)"
          }
        },
        required: ["digest_id"]
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
          let result: ToolResult

          try {
            if (toolUse.name === "send_signup_link") {
              result = await sendSignupLink(toolUse.input as SignupLinkInput)
            } else if (toolUse.name === "get_calendar_events") {
              const input = toolUse.input as CalendarEventsInput
              result = await getCalendarEvents(
                userId!,
                input.start_date,
                input.end_date
              )
            } else if (toolUse.name === "create_calendar_event") {
              result = await createCalendarEvent(userId!, toolUse.input as CreateCalendarEventInput)
            } else if (toolUse.name === "update_calendar_event") {
              const input = toolUse.input as UpdateCalendarEventInput
              result = await updateCalendarEvent(userId!, input.event_id, {
                summary: input.summary,
                start: input.start,
                end: input.end,
                description: input.description,
                location: input.location,
                attendees: input.attendees
              })
            } else if (toolUse.name === "delete_calendar_event") {
              const input = toolUse.input as DeleteCalendarEventInput
              result = await deleteCalendarEvent(
                userId!,
                input.event_id
              )
            } else if (toolUse.name === "create_email_draft") {
              // Create Gmail draft and store in pending_email_drafts table
              const input = toolUse.input as CreateEmailDraftInput
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
              const input = toolUse.input as SendPendingDraftInput
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
              const input = toolUse.input as UpdatePendingDraftInput
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
              result = await searchEmails(userId!, toolUse.input as SearchEmailsInput)
            } else if (toolUse.name === "get_recent_emails") {
              const input = toolUse.input as GetRecentEmailsInput
              result = await getRecentEmails(
                userId!,
                input?.max_results || 10
              )
            } else if (toolUse.name === "create_reminder") {
              const input = toolUse.input as CreateReminderInput

              // Parse the time in the user's timezone
              // If the input doesn't have timezone info, treat it as the user's local time
              let reminderTime: Date
              if (input.time.includes('Z') || input.time.match(/[+-]\d{2}:\d{2}$/)) {
                // Has timezone info, parse as-is
                reminderTime = new Date(input.time)
              } else {
                // No timezone info - interpret as user's local time
                // Convert to ISO string with timezone offset
                const timeWithTZ = input.time + getTimezoneOffset(userTimezone)
                reminderTime = new Date(timeWithTZ)
              }

              const now = new Date()

              // Calculate delay in seconds
              const delaySeconds = Math.floor((reminderTime.getTime() - now.getTime()) / 1000)

              if (delaySeconds <= 0) {
                result = {
                  success: false,
                  error: "Reminder time must be in the future"
                }
              } else {
                let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
                // Ensure URL has a scheme
                if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                  baseUrl = `https://${baseUrl}`
                }
                const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')

                if (isLocalhost) {
                  // Local development mode - can't use Qstash with localhost
                  console.warn('⚠️ Reminder requested in local development mode. Qstash requires a public URL.')
                  result = {
                    success: false,
                    error: "Reminders require a public URL. Set NEXT_PUBLIC_BASE_URL to your ngrok/tunnel URL, or deploy to production."
                  }
                } else {
                  try {
                    const callbackUrl = `${baseUrl}/api/reminders/callback`

                    // Create delayed message in Qstash
                    const qstashResponse = await qstash.publishJSON({
                      url: callbackUrl,
                      delay: delaySeconds,
                      body: {
                        phoneNumber: phoneNumber,
                        intent: input.intent,
                        userId: userId,
                        reminderId: 'TEMP_ID' // Will be updated after insert
                      }
                    })

                    // Qstash returns an array of message IDs
                    const messageId = Array.isArray(qstashResponse) ? qstashResponse[0].messageId : qstashResponse.messageId

                    // Store reminder in database
                    const { data: reminderData, error: dbError } = await supabase
                      .from('reminders')
                      .insert({
                        user_id: userId!,
                        phone_number: phoneNumber,
                        intent: input.intent,
                        scheduled_time: reminderTime.toISOString(),
                        qstash_message_id: messageId,
                        is_sent: false
                      })
                      .select()
                      .single()

                    if (dbError) {
                      // Rollback: Try to cancel the Qstash message
                      try {
                        await fetch(`https://qstash.upstash.io/v2/messages/${messageId}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
                          },
                        })
                      } catch (e) {
                        console.error('Failed to rollback Qstash message:', e)
                      }
                      throw new Error(`Failed to store reminder: ${dbError.message}`)
                    }

                    result = {
                      success: true,
                      message: `Reminder set for ${reminderTime.toLocaleString()}`,
                      reminder_id: reminderData.id
                    }
                  } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    console.error('Error creating reminder:', error)
                    result = {
                      success: false,
                      error: `Failed to create reminder: ${errorMessage}`
                    }
                  }
                }
              }
            } else if (toolUse.name === "list_reminders") {
              try {
                const { data: reminders, error } = await supabase
                  .from('reminders')
                  .select('*')
                  .eq('user_id', userId!)
                  .eq('is_sent', false)
                  .order('scheduled_time', { ascending: true })

                if (error) {
                  result = {
                    success: false,
                    error: `Failed to fetch reminders: ${error.message}`
                  }
                } else if (!reminders || reminders.length === 0) {
                  result = {
                    success: true,
                    message: "No pending reminders",
                    reminders: []
                  }
                } else {
                  result = {
                    success: true,
                    reminders: reminders.map(r => ({
                      id: r.id,
                      intent: r.intent,
                      scheduled_time: r.scheduled_time,
                      created_at: r.created_at
                    }))
                  }
                }
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                result = {
                  success: false,
                  error: `Failed to list reminders: ${errorMessage}`
                }
              }
            } else if (toolUse.name === "cancel_reminder") {
              const input = toolUse.input as CancelReminderInput

              try {
                // Get the reminder to find the Qstash message ID
                const { data: reminder, error: fetchError } = await supabase
                  .from('reminders')
                  .select('qstash_message_id, is_sent')
                  .eq('id', input.reminder_id)
                  .eq('user_id', userId!)
                  .single()

                if (fetchError || !reminder) {
                  result = {
                    success: false,
                    error: "Reminder not found or you don't have permission to cancel it"
                  }
                } else if (reminder.is_sent) {
                  result = {
                    success: false,
                    error: "Reminder already sent, can't cancel"
                  }
                } else {
                  // Cancel the Qstash message
                  const cancelRes = await fetch(
                    `https://qstash.upstash.io/v2/messages/${reminder.qstash_message_id}`,
                    {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
                      },
                    }
                  )

                  if (!cancelRes.ok) {
                    console.error('Failed to cancel Qstash message:', await cancelRes.text())
                    // Continue anyway - better to delete from our DB
                  }

                  // Delete from database
                  const { error: deleteError } = await supabase
                    .from('reminders')
                    .delete()
                    .eq('id', input.reminder_id)
                    .eq('user_id', userId!)

                  if (deleteError) {
                    result = {
                      success: false,
                      error: `Failed to delete reminder: ${deleteError.message}`
                    }
                  } else {
                    result = {
                      success: true,
                      message: "Reminder canceled"
                    }
                  }
                }
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                result = {
                  success: false,
                  error: `Failed to cancel reminder: ${errorMessage}`
                }
              }
            } else if (toolUse.name === "create_digest") {
              const input = toolUse.input as CreateDigestInput

              // Parse time (HH:MM format)
              const timeMatch = input.time.match(/^(\d{1,2}):(\d{2})$/)
              if (!timeMatch) {
                result = {
                  success: false,
                  error: "time must be in HH:MM format (e.g. '07:00', '14:30')"
                }
              } else {
                const send_hour = parseInt(timeMatch[1])
                const send_minute = parseInt(timeMatch[2])

                // Validate day_of_week for weekly digests
                if (input.frequency === 'weekly' && (input.day_of_week === undefined || input.day_of_week === null)) {
                  result = {
                    success: false,
                    error: "day_of_week is required for weekly digests"
                  }
                } else if (send_hour < 0 || send_hour > 23) {
                  result = {
                    success: false,
                    error: "hour must be between 0 and 23"
                  }
                } else if (send_minute < 0 || send_minute > 59) {
                  result = {
                    success: false,
                    error: "minute must be between 0 and 59"
                  }
                } else {
                try {
                  // Get user profile for timezone
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('timezone')
                    .eq('id', userId!)
                    .single()

                  const userTimezone = profile?.timezone || 'America/Los_Angeles'

                  // Generate cron expression (Qstash uses UTC)
                  // We need to convert user's local time to UTC
                  const cronExpression = generateCronExpression(
                    send_hour,
                    send_minute,
                    input.frequency,
                    input.day_of_week,
                    userTimezone
                  )

                  // Create Qstash schedule
                  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
                  // Ensure URL has a scheme
                  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                    baseUrl = `https://${baseUrl}`
                  }

                  const destinationUrl = `${baseUrl}/api/digests/send`
                  console.log('Creating Qstash schedule with destination:', destinationUrl)
                  console.log('Base URL from env:', process.env.NEXT_PUBLIC_BASE_URL)

                  const requestBody = {
                    destination: destinationUrl,
                    cron: cronExpression,
                    body: JSON.stringify({
                      digestId: 'TEMP_ID' // Will be updated after insert
                    })
                  }
                  console.log('Qstash request body:', JSON.stringify(requestBody, null, 2))

                  const scheduleResponse = await fetch('https://qstash.upstash.io/v2/schedules', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                  })

                  if (!scheduleResponse.ok) {
                    const errorText = await scheduleResponse.text()
                    throw new Error(`Failed to create Qstash schedule: ${errorText}`)
                  }

                  const scheduleData = await scheduleResponse.json()
                  const scheduleId = scheduleData.scheduleId

                  // Create digest in database
                  const { data: digestData, error } = await supabase
                    .from('digests')
                    .insert({
                      user_id: userId!,
                      phone_number: phoneNumber,
                      prompt: input.prompt,
                      qstash_schedule_id: scheduleId,
                      timezone: userTimezone,
                      send_hour: send_hour,
                      send_minute: send_minute,
                      frequency: input.frequency,
                      day_of_week: input.day_of_week,
                      is_active: true
                    })
                    .select()
                    .single()

                  if (error) {
                    // Rollback: Delete the Qstash schedule
                    await fetch(`https://qstash.upstash.io/v2/schedules/${scheduleId}`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
                      },
                    })
                    throw new Error(`Failed to create digest: ${error.message}`)
                  }

                  // Update Qstash schedule with real digest ID
                  await fetch(`https://qstash.upstash.io/v2/schedules/${scheduleId}`, {
                    method: 'PATCH',
                    headers: {
                      'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      body: JSON.stringify({
                        digestId: digestData.id,
                        userId: userId,
                        timezone: userTimezone
                      })
                    })
                  })

                  const frequencyText = input.frequency === 'weekly'
                    ? `every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][input.day_of_week!]}`
                    : input.frequency === 'weekdays'
                    ? 'every weekday'
                    : 'every day'

                  result = {
                    success: true,
                    message: `Digest created! You'll receive "${input.prompt}" ${frequencyText} at ${input.time}`,
                    digest_id: digestData.id
                  }
                } catch (error: unknown) {
                  const errorMessage = error instanceof Error ? error.message : String(error)
                  console.error('Error creating digest:', error)
                  result = {
                    success: false,
                    error: `Failed to create digest: ${errorMessage}`
                  }
                }
              }
              }
            } else if (toolUse.name === "list_digests") {
              try {
                const { data: digests, error } = await supabase
                  .from('digests')
                  .select('*')
                  .eq('user_id', userId!)
                  .eq('is_active', true)
                  .order('created_at', { ascending: false })

                if (error) {
                  result = {
                    success: false,
                    error: `Failed to fetch digests: ${error.message}`
                  }
                } else if (!digests || digests.length === 0) {
                  result = {
                    success: true,
                    message: "No active digests found",
                    digests: []
                  }
                } else {
                  result = {
                    success: true,
                    digests: digests.map(d => ({
                      id: d.id,
                      prompt: d.prompt,
                      time: `${String(d.send_hour).padStart(2, '0')}:${String(d.send_minute).padStart(2, '0')}`,
                      frequency: d.frequency,
                      day_of_week: d.day_of_week,
                      created_at: d.created_at
                    }))
                  }
                }
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                result = {
                  success: false,
                  error: `Failed to list digests: ${errorMessage}`
                }
              }
            } else if (toolUse.name === "delete_digest") {
              const input = toolUse.input as DeleteDigestInput

              try {
                // Get the digest to find the Qstash schedule ID
                const { data: digest, error: fetchError } = await supabase
                  .from('digests')
                  .select('qstash_schedule_id')
                  .eq('id', input.digest_id)
                  .eq('user_id', userId!)
                  .single()

                if (fetchError || !digest) {
                  result = {
                    success: false,
                    error: "Digest not found or you don't have permission to delete it"
                  }
                } else {
                  // Delete the Qstash schedule
                  const deleteScheduleRes = await fetch(
                    `https://qstash.upstash.io/v2/schedules/${digest.qstash_schedule_id}`,
                    {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
                      },
                    }
                  )

                  if (!deleteScheduleRes.ok) {
                    console.error('Failed to delete Qstash schedule:', await deleteScheduleRes.text())
                    // Continue anyway - better to delete from our DB
                  }

                  // Delete from database
                  const { error: deleteError } = await supabase
                    .from('digests')
                    .delete()
                    .eq('id', input.digest_id)
                    .eq('user_id', userId!)

                  if (deleteError) {
                    result = {
                      success: false,
                      error: `Failed to delete digest: ${deleteError.message}`
                    }
                  } else {
                    result = {
                      success: true,
                      message: "Digest deleted successfully"
                    }
                  }
                }
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                result = {
                  success: false,
                  error: `Failed to delete digest: ${errorMessage}`
                }
              }
            } else {
              result = { error: `unknown tool: ${toolUse.name}` }
            }

            console.log(`✅ Tool result for ${toolUse.name}:`, JSON.stringify(result, null, 2))
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result)
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error(`❌ Tool error for ${toolUse.name}:`, errorMessage)
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: errorMessage }),
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
      const textBlock = content.find((block): block is Anthropic.TextBlock =>
        typeof block === 'object' && block !== null && 'type' in block && block.type === "text"
      )
      if (textBlock) {
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

// Helper function to generate cron expression for Qstash (UTC-based)
function generateCronExpression(
  localHour: number,
  localMinute: number,
  frequency: 'daily' | 'weekdays' | 'weekly',
  dayOfWeek?: number,
  timezone: string = 'America/Los_Angeles'
): string {
  // Convert local time to UTC
  // Create a date in the user's timezone at the specified time
  const now = new Date()
  const userDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  userDate.setHours(localHour, localMinute, 0, 0)

  // Get the UTC equivalent
  const utcDate = new Date(userDate.toLocaleString('en-US', { timeZone: 'UTC' }))
  const utcHour = utcDate.getHours()
  const utcMinute = utcDate.getMinutes()

  // Cron format: minute hour day-of-month month day-of-week
  // Example: "30 14 * * 1" = Every Monday at 2:30pm UTC

  if (frequency === 'daily') {
    // Run every day at the specified UTC time
    return `${utcMinute} ${utcHour} * * *`
  } else if (frequency === 'weekdays') {
    // Run Monday-Friday (1-5) at the specified UTC time
    return `${utcMinute} ${utcHour} * * 1-5`
  } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
    // Run on specific day of week at the specified UTC time
    return `${utcMinute} ${utcHour} * * ${dayOfWeek}`
  }

  throw new Error('Invalid frequency or missing day_of_week')
}

// Helper function to send signup link
async function sendSignupLink(input: { phone_number: string }) {
  const { phone_number } = input
  const formattedPhone = formatPhoneNumberE164(phone_number)
  const verificationToken = generateVerificationToken(10)

  // Check if there's already a pending verification for this phone number
  const { data: existing } = await supabase
    .from('pending_verifications')
    .select('verification_token')
    .eq('phone_number', formattedPhone)
    .maybeSingle()

  const tokenToUse = existing?.verification_token || verificationToken

  // Insert if it doesn't exist
  if (!existing) {
    const { error } = await supabase
      .from('pending_verifications')
      .insert({
        phone_number: formattedPhone,
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
      formattedPhone,
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

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error on attempt ${attempt}:`, errorMessage)
      lastError = error instanceof Error ? error : new Error(String(error))

      // If it's a non-retryable error, throw immediately
      if (error instanceof Error && error.message?.includes('Non-retryable')) {
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

// Helper to get timezone offset string for a given timezone
function getTimezoneOffset(timezone: string): string {
  const now = new Date()
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offsetMs = tzDate.getTime() - utcDate.getTime()
  const offsetMinutes = offsetMs / 60000
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
  const offsetMins = Math.abs(offsetMinutes) % 60
  const sign = offsetMinutes >= 0 ? '+' : '-'
  return `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`
}
