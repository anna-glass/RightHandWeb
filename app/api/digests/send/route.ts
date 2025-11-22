import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Receiver } from '@upstash/qstash'
import { getAuthenticatedSystemPrompt } from '@/lib/system-prompts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Type for tool inputs
interface CalendarEventsInput {
  start_date: string
  end_date?: string
}

interface WebSearchInput {
  query: string
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
          first_name,
          city
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
    const userCity = profile.city || null

    // Build frequency description for context
    const frequencyDesc = digest.frequency === 'daily' ? 'daily'
      : digest.frequency === 'weekdays' ? 'weekday'
      : digest.frequency === 'weekly' ? 'weekly'
      : digest.frequency === 'mon_wed_fri' ? 'Mon/Wed/Fri'
      : digest.frequency === 'tue_thu' ? 'Tue/Thu'
      : digest.frequency === 'weekends' ? 'weekend'
      : digest.frequency === 'monthly' ? 'monthly'
      : digest.frequency

    // Generate digest content using Claude
    const digestPrompt = `This is the user's scheduled ${frequencyDesc} digest. The user asked for: "${digest.prompt}". Start your response with a brief greeting acknowledging this is their ${frequencyDesc} update, then provide the info.`

    const digestContent = await generateDigestContent(
      userId,
      digestPrompt,
      timezone || digest.timezone,
      userName,
      userCity
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
  userName: string,
  userCity: string | null
): Promise<string> {
  try {
    console.log('🤖 Generating digest content:', { userId, prompt, userTimezone, userName, userCity })
    const systemPrompt = getAuthenticatedSystemPrompt(userTimezone, userName, userCity)

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
              start_date: { type: "string", description: "start date in YYYY-MM-DD format" },
              end_date: { type: "string", description: "end date in YYYY-MM-DD format (optional)" }
            },
            required: ["start_date"]
          }
        },
        {
          name: "web_search",
          description: "search the internet for current info (weather, news, sports, facts, etc.)",
          input_schema: {
            type: "object",
            properties: {
              query: { type: "string", description: "the search query" }
            },
            required: ["query"]
          }
        }
      ]
    })

    console.log('🤖 Claude initial response:', { stop_reason: response.stop_reason, content_types: response.content.map(b => b.type) })

    // Handle tool use if needed
    if (response.stop_reason === "tool_use") {
      const toolCalls = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      )

      console.log('🔧 Tool calls:', toolCalls.map(t => ({ name: t.name, input: t.input })))

      const toolResults = await Promise.all(
        toolCalls.map(async (toolUse) => {
          let result: unknown

          if (toolUse.name === "get_calendar_events") {
            const { getCalendarEvents } = await import('@/lib/google-calendar')
            const input = toolUse.input as CalendarEventsInput
            result = await getCalendarEvents(userId, input.start_date, input.end_date)
            console.log('📅 Calendar result:', JSON.stringify(result))
          } else if (toolUse.name === "web_search") {
            const input = toolUse.input as WebSearchInput
            try {
              const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'sonar',
                  messages: [{ role: 'user', content: input.query }]
                })
              })
              if (perplexityResponse.ok) {
                const data = await perplexityResponse.json()
                result = { success: true, answer: data.choices?.[0]?.message?.content || 'No results' }
              } else {
                result = { success: false, error: `Search failed: ${perplexityResponse.status}` }
              }
            } catch (e) {
              result = { success: false, error: String(e) }
            }
            console.log('🔍 Web search result:', JSON.stringify(result))
          } else {
            result = { error: `Unknown tool: ${toolUse.name}` }
          }

          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
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

      console.log('🤖 Claude final response:', { stop_reason: finalResponse.stop_reason, content: finalResponse.content })

      const textBlock = finalResponse.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      )
      const result = textBlock?.text.trim()
      if (!result) {
        throw new Error('Claude returned empty response after tool use')
      }
      console.log('📝 Final digest content:', result)
      return result
    }

    // No tool use, return text directly
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    )
    const result = textBlock?.text.trim()
    if (!result) {
      throw new Error('Claude returned empty response')
    }
    console.log('📝 Digest content (no tools):', result)
    return result
  } catch (error) {
    console.error('❌ Error generating digest content:', error)
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
