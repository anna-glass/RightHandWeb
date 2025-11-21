import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Client as QstashClient } from '@upstash/qstash'
import { formatPhoneNumberE164 } from '@/lib/phone-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Qstash client for reliable background job processing
const qstash = new QstashClient({
  token: process.env.QSTASH_TOKEN!,
})

interface BlooioWebhookPayload {
  event: string
  message_id: string
  external_id: string
  text: string
  attachments: unknown[]
  protocol: string
  device_id: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: BlooioWebhookPayload = await request.json()

    // Get event type from header (Blooio sends event type in x-blooio-event header)
    const eventType = request.headers.get('x-blooio-event') || payload.event

    console.log('Blooio webhook received:', {
      event: eventType,
      message_id: payload.message_id,
      sender: payload.external_id
    })

    // Only process message.sent and message.received events
    if (eventType !== 'message.sent' && eventType !== 'message.received') {
      console.log(`Ignoring event: ${eventType}`)
      return NextResponse.json(
        { success: true, message: `Event ${eventType} ignored` },
        { status: 200 }
      )
    }

    // Validate required fields
    if (!payload.message_id || !payload.external_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1. ATOMICALLY SAVE MESSAGE (ACID compliance)
    const formattedPhone = formatPhoneNumberE164(payload.external_id)
    const messageData = {
      event: eventType,
      message_id: payload.message_id,
      sender: formattedPhone,
      text: payload.text,
      attachments: payload.attachments,
      protocol: payload.protocol,
      device_id: payload.device_id,
      profile_id: null, // Will be linked later during verification
    }

    const { error: insertError } = await supabase
      .from('imessages')
      .insert(messageData)

    if (insertError) {
      // If it's a duplicate message, just log and continue (Blooio might retry webhooks)
      if (insertError.code === '23505') {
        console.log('Message already exists, skipping:', payload.message_id)
        return NextResponse.json(
          { success: true, message_id: payload.message_id, duplicate: true },
          { status: 200 }
        )
      }

      console.error('Error saving message:', insertError)
      return NextResponse.json(
        { error: 'Failed to save message', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('Message saved successfully:', payload.message_id)

    // 2. QUEUE BACKGROUND PROCESSING via Qstash (reliable in serverless)
    if (eventType === 'message.received') {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const processUrl = `${baseUrl}/api/process-message`

      try {
        console.log('🚀 Queueing message processing via Qstash:', {
          url: processUrl,
          messageId: payload.message_id,
          sender: formattedPhone
        })

        // Publish to Qstash - guaranteed delivery even if webhook terminates
        const response = await qstash.publishJSON({
          url: processUrl,
          body: {
            messageId: payload.message_id,
            sender: formattedPhone,
            text: payload.text
          }
        })

        const messageId = Array.isArray(response) ? response[0].messageId : response.messageId
        console.log('✅ Message queued successfully in Qstash:', messageId)
      } catch (error) {
        console.error('❌ Failed to queue message in Qstash:', error)
        // Don't throw - we don't want to fail the webhook
      }
    }

    // 3. RETURN IMMEDIATELY
    return NextResponse.json(
      { success: true, message_id: payload.message_id },
      { status: 200 }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to Blooio - we received the webhook
    return NextResponse.json(
      { success: true, error: 'Internal error but webhook received' },
      { status: 200 }
    )
  }
}
