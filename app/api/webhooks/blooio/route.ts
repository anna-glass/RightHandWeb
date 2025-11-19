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
  device_id: string
}

// Helper function to generate a random verification token
function generateVerificationToken(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
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

    // Look up profile by phone number (single indexed query)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', payload.external_id)
      .single()

    let profileId = profile?.id || null

    // If no profile exists, create one and send verification
    if (!profileId) {
      const verificationToken = generateVerificationToken(10)

      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          phone_number: payload.external_id,
          verified: false,
          verification_token: verificationToken,
        })
        .select('id')
        .single()

      if (newProfile) {
        profileId = newProfile.id

        // Send verification link via Blooio
        const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify?token=${verificationToken}`
        const verificationText = `Welcome to RightHand! Verify your account: ${verificationUrl}`

        try {
          await fetch('https://backend.blooio.com/v1/api/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.BLOOIO_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: payload.external_id,
              text: verificationText,
            })
          })

          // Store the sent verification message in the database
          await supabase
            .from('imessages')
            .insert({
              event: 'message.sent',
              message_id: `verification_${verificationToken}`,
              sender: payload.external_id,
              text: verificationText,
              attachments: [],
              protocol: 'imessage',
              device_id: payload.device_id,
              profile_id: profileId,
            })
        } catch (error) {
          console.error('Error sending verification message:', error)
        }
      }
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
        device_id: payload.device_id,
        profile_id: profileId, // Link to profile if found
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
