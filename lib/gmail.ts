/**
 * lib/gmail.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get authenticated Gmail client for a user
async function getGmailClient(userId: string) {
  // Fetch user's Google tokens from database
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('google_calendar_token, google_refresh_token, email')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new Error('User profile not found')
  }

  if (!profile.google_calendar_token || !profile.google_refresh_token) {
    throw new Error('Gmail not connected')
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  // Set credentials
  oauth2Client.setCredentials({
    access_token: profile.google_calendar_token,
    refresh_token: profile.google_refresh_token,
  })

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await supabase
        .from('profiles')
        .update({ google_calendar_token: tokens.access_token })
        .eq('id', userId)
    }
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  return { gmail, userEmail: profile.email }
}

// Send an email (or reply to a thread)
export async function sendEmail(
  userId: string,
  params: {
    to: string
    subject: string
    body: string
    cc?: string
    bcc?: string
    threadId?: string
    inReplyTo?: string
  }
) {
  try {
    const { gmail, userEmail } = await getGmailClient(userId)

    // Build email message in RFC 2822 format
    const headers = [
      `From: ${userEmail}`,
      `To: ${params.to}`,
      params.cc ? `Cc: ${params.cc}` : null,
      params.bcc ? `Bcc: ${params.bcc}` : null,
      `Subject: ${params.subject}`,
      params.inReplyTo ? `In-Reply-To: ${params.inReplyTo}` : null,
      params.inReplyTo ? `References: ${params.inReplyTo}` : null,
      'Content-Type: text/plain; charset=utf-8',
    ].filter(Boolean)

    // RFC 2822 requires blank line between headers and body
    const message = headers.join('\n') + '\n\n' + params.body

    // Encode message in base64url format
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: params.threadId,
      },
    })

    console.log('Email sent successfully:', response.data.id)

    return {
      success: true,
      messageId: response.data.id,
      message: 'email sent'
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'failed to send email'
    console.error('Error sending email:', error)
    return {
      success: false,
      error: errorMessage
    }
  }
}


