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
  attachments: unknown[]
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

// Helper function to send Blooio messages with retry logic and exponential backoff
async function sendBlooioMessageWithRetry(
  body: { to: string; text: string },
  { maxAttempts = 5 } = {}
) {
  let attempt = 0
  while (attempt < maxAttempts) {
    attempt++
    const idempotencyKey = `retry-${Date.now()}-${attempt}-${body.to}`

    console.log(`Attempt ${attempt}/${maxAttempts} to send Blooio message`)

    const res = await fetch('https://backend.blooio.com/v1/api/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BLOOIO_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(body)
    })

    console.log(`Blooio response status (attempt ${attempt}):`, res.status)

    if (res.ok) {
      const data = await res.json()
      console.log('Blooio message sent successfully:', data)
      return data
    }

    const responseText = await res.text()
    console.log(`Blooio response (attempt ${attempt}):`, responseText)

    // Don't retry for non-500 errors (client errors like 400, 401, 403, 404)
    if (res.status < 500) {
      throw new Error(`Non-retryable Blooio error: ${res.status} - ${responseText}`)
    }

    // If we haven't reached max attempts, wait before retrying
    if (attempt < maxAttempts) {
      const backoffMs = Math.min(1000 * 2 ** attempt, 10000)
      console.log(`Waiting ${backoffMs}ms before retry...`)
      await new Promise(r => setTimeout(r, backoffMs))
    }
  }

  throw new Error(`Max retry attempts (${maxAttempts}) reached for Blooio message`)
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
    console.log(`Looking up profile for phone number: ${payload.external_id}`)
    const { data: profile, error: profileLookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', payload.external_id)
      .maybeSingle()

    if (profileLookupError) {
      console.error('Error looking up profile:', profileLookupError)
    }

    console.log('Profile lookup result:', profile)

    const profileId = profile?.id || null

    // Only run verification flow for incoming messages (message.received)
    // Skip verification for outgoing messages (message.sent) to avoid infinite loops
    if (!profileId && eventType === 'message.received') {
      console.log('No profile found, creating pending verification...')
      const verificationToken = generateVerificationToken(10)

      // Check if there's already a pending verification for this phone number
      const { data: existingVerification } = await supabase
        .from('pending_verifications')
        .select('verification_token')
        .eq('phone_number', payload.external_id)
        .maybeSingle()

      let tokenToUse = verificationToken

      if (existingVerification) {
        console.log('Pending verification already exists, using existing token')
        tokenToUse = existingVerification.verification_token
      } else {
        // Insert into pending_verifications table
        const { error: insertError } = await supabase
          .from('pending_verifications')
          .insert({
            verification_token: verificationToken,
            phone_number: payload.external_id,
          })

        if (insertError) {
          console.error('Error creating pending verification:', insertError)
          console.error('Insert error details:', JSON.stringify(insertError, null, 2))
        } else {
          console.log('Pending verification created successfully')
        }
      }

      // Send verification link via Blooio
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const verificationUrl = `${baseUrl}/verify/${tokenToUse}`
      const verificationText = `Hiii!! Hit this link - ${verificationUrl}`

      console.log(`Sending verification message to ${payload.external_id}`)
      console.log('Verification message text:', verificationText)
      console.log('BLOOIO_API_KEY exists:', !!process.env.BLOOIO_API_KEY)

      const blooioRequestBody = {
        to: payload.external_id,
        text: verificationText,
      }
      console.log('Blooio request body:', JSON.stringify(blooioRequestBody, null, 2))

      try {
        await sendBlooioMessageWithRetry(blooioRequestBody)
        console.log('Verification message sent successfully. Blooio will send a webhook to save it.')
      } catch (error) {
        console.error('Error sending verification message:', error)
      }
    } else {
      console.log(`Existing profile found with ID: ${profileId}`)
    }

    // Save message to Supabase
    console.log('Saving incoming message to database...')
    console.log('Profile ID for message:', profileId)

    const messageData = {
      event: eventType, // Use event type from header
      message_id: payload.message_id,
      sender: payload.external_id, // external_id is the sender
      text: payload.text,
      attachments: payload.attachments,
      protocol: payload.protocol,
      device_id: payload.device_id,
      profile_id: profileId, // Link to profile if found
    }

    console.log('Message data to insert:', JSON.stringify(messageData, null, 2))

    const { data, error } = await supabase
      .from('imessages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      // If it's a duplicate message, just log and continue (Blooio might retry webhooks)
      if (error.code === '23505') {
        console.log('Message already exists, skipping:', payload.message_id)
        return NextResponse.json(
          { success: true, message_id: payload.message_id, duplicate: true },
          { status: 200 }
        )
      }

      // For other errors, return error response
      console.error('Error saving message to Supabase:', error)
      console.error('Message insert error details:', JSON.stringify(error, null, 2))
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
