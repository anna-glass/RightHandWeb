import { google } from 'googleapis'
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

// Get calendar events
export async function getCalendarEvents(
  userId: string,
  startDate: string,
  endDate?: string
) {
  try {
    const { calendar, timezone } = await getCalendarClient(userId)

    console.log('Fetching calendar events:', { startDate, endDate, timezone })

    // Parse dates more carefully - add explicit time to avoid timezone issues
    const startDateTime = new Date(startDate + 'T00:00:00')
    const endDateTime = endDate
      ? new Date(endDate + 'T23:59:59')
      : new Date(startDateTime.getTime() + 24 * 60 * 60 * 1000)

    const timeMin = startDateTime.toISOString()
    const timeMax = endDateTime.toISOString()

    console.log('Query range:', { timeMin, timeMax })

    // Also try to get a count of ALL events to verify auth works
    try {
      const testResponse = await calendar.events.list({
        calendarId: 'primary',
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime',
      })
      console.log('Test query (no date filter):', {
        totalEventsInCalendar: testResponse.data.items?.length || 0
      })
    } catch (testError: any) {
      console.error('Test query failed:', testError.message)
    }

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })

    console.log('Calendar API response:', {
      status: response.status,
      itemCount: response.data.items?.length || 0
    })

    const events = response.data.items || []

    if (events.length === 0) {
      console.warn('No events found in calendar for range:', { timeMin, timeMax })
    }

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
  } catch (error: any) {
    console.error('Error fetching calendar events:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errors: error.errors
    })
    return {
      success: false,
      error: error.message || 'failed to fetch events'
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
  }
) {
  try {
    const { calendar, timezone } = await getCalendarClient(userId)

    // Determine if all-day event or timed event
    const isAllDay = !params.start.includes('T')

    const event = {
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

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
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
  } catch (error: any) {
    console.error('Error creating calendar event:', error)
    return {
      success: false,
      error: error.message || 'failed to create event'
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

    // Build update object
    const updates: any = {
      summary: params.summary || existing.data.summary,
      description: params.description !== undefined ? params.description : existing.data.description,
      location: params.location !== undefined ? params.location : existing.data.location,
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

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updates,
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
  } catch (error: any) {
    console.error('Error updating calendar event:', error)
    return {
      success: false,
      error: error.message || 'failed to update event'
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
  } catch (error: any) {
    console.error('Error deleting calendar event:', error)
    return {
      success: false,
      error: error.message || 'failed to delete event'
    }
  }
}
