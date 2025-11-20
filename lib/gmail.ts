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

// Search for emails by person or subject
export async function searchEmails(
  userId: string,
  params: {
    query: string
    maxResults?: number
  }
) {
  try {
    const { gmail } = await getGmailClient(userId)

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: params.query,
      maxResults: params.maxResults || 5,
    })

    const messages = response.data.messages || []

    if (messages.length === 0) {
      return {
        success: true,
        emails: [],
        message: 'no emails found'
      }
    }

    // Get full message details
    const fullMessages = await Promise.all(
      messages.map(async (msg) => {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID'],
        })

        const headers = details.data.payload?.headers || []
        const getHeader = (name: string) =>
          headers.find((h) => h.name === name)?.value || ''

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          messageId: getHeader('Message-ID'),
          snippet: details.data.snippet,
        }
      })
    )

    return {
      success: true,
      emails: fullMessages
    }
  } catch (error: any) {
    console.error('Error searching emails:', error)
    return {
      success: false,
      error: error.message || 'failed to search emails'
    }
  }
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
  } catch (error: any) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error.message || 'failed to send email'
    }
  }
}

// Create a Gmail draft
export async function createDraft(
  userId: string,
  params: {
    to: string
    subject: string
    body: string
    cc?: string
    bcc?: string
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
      'Content-Type: text/plain; charset=utf-8',
    ].filter(Boolean)

    const message = headers.join('\n') + '\n\n' + params.body

    // Encode message in base64url format
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    })

    console.log('Draft created successfully:', response.data.id)

    return {
      success: true,
      draftId: response.data.id!,
      message: 'draft created'
    }
  } catch (error: any) {
    console.error('Error creating draft:', error)
    return {
      success: false,
      error: error.message || 'failed to create draft'
    }
  }
}

// Update a Gmail draft
export async function updateDraft(
  userId: string,
  draftId: string,
  params: {
    to?: string
    subject?: string
    body?: string
    cc?: string
    bcc?: string
  }
) {
  try {
    const { gmail, userEmail } = await getGmailClient(userId)

    // Get the current draft to merge with updates
    const currentDraft = await gmail.users.drafts.get({
      userId: 'me',
      id: draftId,
      format: 'raw',
    })

    // Decode current message to extract current values
    const currentRaw = currentDraft.data.message?.raw || ''
    const currentDecoded = Buffer.from(currentRaw, 'base64').toString()
    const currentHeaders = currentDecoded.split('\n\n')[0]

    // Extract current values
    const getHeader = (name: string) => {
      const match = currentHeaders.match(new RegExp(`^${name}: (.+)$`, 'm'))
      return match ? match[1] : ''
    }

    // Build updated message
    const headers = [
      `From: ${userEmail}`,
      `To: ${params.to || getHeader('To')}`,
      params.cc !== undefined ? (params.cc ? `Cc: ${params.cc}` : null) : (getHeader('Cc') ? `Cc: ${getHeader('Cc')}` : null),
      params.bcc !== undefined ? (params.bcc ? `Bcc: ${params.bcc}` : null) : (getHeader('Bcc') ? `Bcc: ${getHeader('Bcc')}` : null),
      `Subject: ${params.subject || getHeader('Subject')}`,
      'Content-Type: text/plain; charset=utf-8',
    ].filter(Boolean)

    const currentBody = currentDecoded.split('\n\n').slice(1).join('\n\n')
    const message = headers.join('\n') + '\n\n' + (params.body || currentBody)

    // Encode message
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const response = await gmail.users.drafts.update({
      userId: 'me',
      id: draftId,
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    })

    console.log('Draft updated successfully:', response.data.id)

    return {
      success: true,
      draftId: response.data.id!,
      message: 'draft updated'
    }
  } catch (error: any) {
    console.error('Error updating draft:', error)
    return {
      success: false,
      error: error.message || 'failed to update draft'
    }
  }
}

// Send a Gmail draft
export async function sendDraft(
  userId: string,
  draftId: string
) {
  try {
    const { gmail } = await getGmailClient(userId)

    const response = await gmail.users.drafts.send({
      userId: 'me',
      requestBody: {
        id: draftId,
      },
    })

    console.log('Draft sent successfully:', response.data.id)

    return {
      success: true,
      messageId: response.data.id,
      message: 'email sent'
    }
  } catch (error: any) {
    console.error('Error sending draft:', error)
    return {
      success: false,
      error: error.message || 'failed to send draft'
    }
  }
}

// Get recent emails
export async function getRecentEmails(
  userId: string,
  maxResults: number = 10
) {
  try {
    const { gmail } = await getGmailClient(userId)

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX'],
    })

    const messages = response.data.messages || []

    // Get full message details for each
    const fullMessages = await Promise.all(
      messages.map(async (msg) => {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        })

        const headers = details.data.payload?.headers || []
        const getHeader = (name: string) =>
          headers.find((h) => h.name === name)?.value || ''

        return {
          id: msg.id,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: details.data.snippet,
        }
      })
    )

    return {
      success: true,
      emails: fullMessages
    }
  } catch (error: any) {
    console.error('Error fetching emails:', error)
    return {
      success: false,
      error: error.message || 'failed to fetch emails'
    }
  }
}
