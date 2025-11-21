import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get authenticated Google Calendar client for a user
async function getCalendarClient(userId: string) {
  // Fetch user's Google tokens and timezone from database
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('google_calendar_token, google_refresh_token, email, timezone')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new Error('User profile not found')
  }

  if (!profile.google_calendar_token || !profile.google_refresh_token) {
    throw new Error('Google Calendar not connected')
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

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  return { calendar, timezone: profile.timezone || 'America/Los_Angeles' }
}

// Helper to convert local date/time to UTC ISO string
function localToUtcIso(dateStr: string, timeStr: string, timezone: string): string {
  // Create a date object for this date/time as if it were in UTC
  const tempDate = new Date(`${dateStr}T${timeStr}Z`)

  // Calculate the offset between UTC and the target timezone
  const utcStr = tempDate.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = tempDate.toLocaleString('en-US', { timeZone: timezone })
  const diffMs = new Date(utcStr).getTime() - new Date(tzStr).getTime()

  // Adjust: if user wants midnight local time, we need to shift by the offset
  const localMidnight = new Date(`${dateStr}T${timeStr}`)
  const utcEquivalent = new Date(localMidnight.getTime() + diffMs)

  return utcEquivalent.toISOString()
}

// Get calendar events
export async function getCalendarEvents(
  userId: string,
  startDate: string,
  endDate?: string
) {
  try {
    const { calendar, timezone } = await getCalendarClient(userId)

    const effectiveEndDate = endDate || startDate

    // Convert local date range to UTC timestamps
    // e.g., "2025-11-21" in America/Los_Angeles becomes 2025-11-21T08:00:00Z (midnight PST = 8am UTC)
    const timeMin = localToUtcIso(startDate, '00:00:00', timezone)
    const timeMax = localToUtcIso(effectiveEndDate, '23:59:59', timezone)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })

    const events = response.data.items || []

    return {
      success: true,
      events: events.map(event => ({
        id: event.id,
        summary: event.summary || 'untitled',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        description: event.description,
      }))
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'failed to fetch events'
    console.error('Error fetching calendar events:', error)
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Error details:', {
        message: (error as { message?: unknown }).message,
        code: (error as { code?: unknown }).code,
        errors: (error as { errors?: unknown }).errors
      })
    }
    return {
      success: false,
      error: errorMessage
    }
  }
}

// Create calendar event
export async function createCalendarEvent(
  userId: string,
  params: {
    summary: string
    start: string // ISO datetime or date
    end: string   // ISO datetime or date
    description?: string
    location?: string
    attendees?: string // Comma-separated email addresses
  }
) {
  try {
    const { calendar, timezone } = await getCalendarClient(userId)

    // Determine if all-day event or timed event
    const isAllDay = !params.start.includes('T')

    // Parse attendees if provided
    const attendeesList = params.attendees
      ? params.attendees.split(',').map(email => ({ email: email.trim() }))
      : undefined

    const event: calendar_v3.Schema$Event = {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: isAllDay
        ? { date: params.start }
        : { dateTime: params.start, timeZone: timezone },
      end: isAllDay
        ? { date: params.end }
        : { dateTime: params.end, timeZone: timezone },
    }

    if (attendeesList && attendeesList.length > 0) {
      event.attendees = attendeesList
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: attendeesList && attendeesList.length > 0 ? 'all' : 'none',
    })

    return {
      success: true,
      eventId: response.data.id,
      event: {
        id: response.data.id,
        summary: response.data.summary,
        start: response.data.start?.dateTime || response.data.start?.date,
        end: response.data.end?.dateTime || response.data.end?.date,
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'failed to create event'
    console.error('Error creating calendar event:', error)
    return {
      success: false,
      error: errorMessage
    }
  }
}

// Update calendar event
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  params: {
    summary?: string
    start?: string
    end?: string
    description?: string
    location?: string
    attendees?: string // Comma-separated email addresses
  }
) {
  try {
    const { calendar, timezone } = await getCalendarClient(userId)

    // First, get the existing event
    const existing = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    })

    if (!existing.data) {
      return {
        success: false,
        error: 'event not found'
      }
    }

    // Parse attendees if provided
    console.log('params.attendees:', params.attendees, 'type:', typeof params.attendees)
    const attendeesList = params.attendees !== undefined
      ? (params.attendees ? params.attendees.split(',').map(email => ({ email: email.trim() })) : [])
      : undefined
    console.log('attendeesList:', attendeesList)

    // Build update object
    const updates: calendar_v3.Schema$Event = {
      summary: params.summary || existing.data.summary,
      description: params.description !== undefined ? params.description : existing.data.description,
      location: params.location !== undefined ? params.location : existing.data.location,
    }

    // Update attendees if specified
    if (attendeesList !== undefined) {
      console.log('Setting attendees on updates:', attendeesList)
      updates.attendees = attendeesList
    } else {
      console.log('Using existing attendees:', existing.data.attendees)
      updates.attendees = existing.data.attendees
    }

    if (params.start) {
      const isAllDay = !params.start.includes('T')
      updates.start = isAllDay
        ? { date: params.start }
        : { dateTime: params.start, timeZone: timezone }
    } else {
      updates.start = existing.data.start
    }

    if (params.end) {
      const isAllDay = !params.end.includes('T')
      updates.end = isAllDay
        ? { date: params.end }
        : { dateTime: params.end, timeZone: timezone }
    } else {
      updates.end = existing.data.end
    }

    console.log('Updating event with:', JSON.stringify(updates, null, 2))
    console.log('sendUpdates:', attendeesList !== undefined ? 'all' : 'none')

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updates,
      sendUpdates: attendeesList !== undefined ? 'all' : 'none',
    })

    console.log('Updated event response:', {
      id: response.data.id,
      attendees: response.data.attendees?.map(a => a.email)
    })

    return {
      success: true,
      event: {
        id: response.data.id,
        summary: response.data.summary,
        start: response.data.start?.dateTime || response.data.start?.date,
        end: response.data.end?.dateTime || response.data.end?.date,
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'failed to update event'
    console.error('Error updating calendar event:', error)
    return {
      success: false,
      error: errorMessage
    }
  }
}

// Delete calendar event
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
) {
  try {
    const { calendar } = await getCalendarClient(userId)

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    })

    return {
      success: true,
      message: 'event deleted'
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'failed to delete event'
    console.error('Error deleting calendar event:', error)
    return {
      success: false,
      error: errorMessage
    }
  }
}
