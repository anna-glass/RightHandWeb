import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Receiver } from '@upstash/qstash'
import { getAuthenticatedSystemPrompt } from '@/lib/system-prompts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Type for calendar events tool input
interface CalendarEventsInput {
  start_date: string
  end_date?: string
}

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
    // Read body once
    const bodyText = await req.text()
    const { digestId, userId, timezone } = JSON.parse(bodyText || '{}')

    // Verify Qstash signature if keys are available
    if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
      const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
      })

      const signature = req.headers.get('upstash-signature')

      if (!signature) {
        console.error('Missing Qstash signature')
        return NextResponse.json(
          { error: 'Missing signature' },
          { status: 401 }
        )
      }

      try {
        await receiver.verify({
          signature,
          body: bodyText,
        })
      } catch (error) {
        console.error('Invalid Qstash signature:', error)
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else if (process.env.NODE_ENV !== 'development') {
      // Production without signing keys - reject
      console.error('Qstash signing keys not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (!digestId || !userId) {
      console.error('Missing digestId or userId in request')
      return NextResponse.json(
        { error: 'Missing digestId or userId' },
        { status: 400 }
      )
    }

    console.log(`📅 Processing digest ${digestId} for user ${userId}`)

    // Get the digest
    const { data: digest, error: digestError } = await supabase
      .from('digests')
      .select(`
        *,
        profiles!inner(
          id,
          first_name
        )
      `)
      .eq('id', digestId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (digestError || !digest) {
      console.error('Digest not found or inactive:', digestError)
      return NextResponse.json(
        { error: 'Digest not found or inactive' },
        { status: 404 }
      )
    }

    const profile = digest.profiles
    const userName = profile.first_name || 'User'

    // Generate digest content using Claude
    const digestContent = await generateDigestContent(
      userId,
      digest.prompt,
      timezone || digest.timezone,
      userName
    )

    // Send via Blooio
    const sendResult = await sendBlooioMessage(digest.phone_number, digestContent)

    if (sendResult.success) {
      // Update last_sent_at
      await supabase
        .from('digests')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', digestId)

      console.log(`✅ Digest ${digestId} sent successfully`)
      return NextResponse.json({ success: true }, { status: 200 })
    } else {
      console.error(`Failed to send digest ${digestId}:`, sendResult.error)
      return NextResponse.json(
        { error: sendResult.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in digest send job:', error)
    return NextResponse.json(
      { error: 'Failed to process digests' },
      { status: 500 }
    )
  }
}

async function generateDigestContent(
  userId: string,
  prompt: string,
  userTimezone: string,
  userName: string
): Promise<string> {
  try {
    const systemPrompt = getAuthenticatedSystemPrompt(userTimezone, userName)

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      tools: [
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
        }
      ]
    })

    // Handle tool use if needed
    if (response.stop_reason === "tool_use") {
      const toolCalls = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      )

      const toolResults = await Promise.all(
        toolCalls.map(async (toolUse) => {
          if (toolUse.name === "get_calendar_events") {
            const { getCalendarEvents } = await import('@/lib/google-calendar')
            const input = toolUse.input as CalendarEventsInput
            const result = await getCalendarEvents(
              userId,
              input.start_date,
              input.end_date
            )
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result)
            }
          }
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: "Unknown tool" })
          }
        })
      )

      // Get final response after tool use
      const finalResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt
          },
          {
            role: "assistant",
            content: response.content
          },
          {
            role: "user",
            content: toolResults
          }
        ]
      })

      const textBlock = finalResponse.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      )
      return textBlock?.text.trim() || "Could not generate digest"
    }

    // No tool use, return text directly
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    )
    return textBlock?.text.trim() || "Could not generate digest"
  } catch (error) {
    console.error('Error generating digest content:', error)
    throw error
  }
}

async function sendBlooioMessage(phoneNumber: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('https://backend.blooio.com/v1/api/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BLOOIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phoneNumber,
        text: text
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      return { success: false, error: `Blooio API error: ${res.status} - ${errorText}` }
    }

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
}
