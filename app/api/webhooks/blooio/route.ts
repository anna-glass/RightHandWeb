import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BlooioWebhookPayload {
  event: string
  message_id: string
  external_id: string
  text: string
  attachments: any[]
  protocol: string
  timestamp: number
  device_id: string
  received_at: number
}

export async function POST(request: NextRequest) {
  try {
    const payload: BlooioWebhookPayload = await request.json()

    // Get event type from header (Blooio sends event type in x-blooio-event header)
    const eventType = request.headers.get('x-blooio-event') || payload.event

    console.log('Blooio webhook received:')
    console.log('- Event (header):', request.headers.get('x-blooio-event'))
    console.log('- Event (body):', payload.event)
    console.log('- Message ID:', payload.message_id)
    console.log('- Full payload:', JSON.stringify(payload, null, 2))

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

    // Save message to Supabase
    const { data, error } = await supabase
      .from('imessages')
      .insert({
        event: eventType, // Use event type from header
        message_id: payload.message_id,
        sender: payload.external_id, // external_id is the sender
        text: payload.text,
        attachments: payload.attachments,
        protocol: payload.protocol,
        timestamp: payload.timestamp,
        device_id: payload.device_id,
        received_at: payload.received_at,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving message to Supabase:', error)
      return NextResponse.json(
        { error: 'Failed to save message', details: error.message },
        { status: 500 }
      )
    }

    console.log('Message saved successfully:', data)

    // Return success response
    return NextResponse.json(
      { success: true, message_id: payload.message_id },
      { status: 200 }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
