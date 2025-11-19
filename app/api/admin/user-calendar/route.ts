import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('email')

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      )
    }

    // Create Supabase client for auth check
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Verify the requesting user is an admin
    const { data: { user: adminUser } } = await supabaseAuth.auth.getUser()

    if (!adminUser || !adminUser.email?.endsWith('@getrighthand.com')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Create Supabase client with service role for data access
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Fetch the target user's profile from the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'User not found', details: profileError?.message },
        { status: 404 }
      )
    }

    // Check if user has connected Google Calendar
    if (!profile.google_calendar_token) {
      return NextResponse.json(
        {
          error: 'User has not connected Google Calendar',
          profile,
          calendarConnected: false
        },
        { status: 200 }
      )
    }

    // Use Google API with the stored tokens
    const { google } = await import('googleapis')

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: profile.google_calendar_token,
      refresh_token: profile.google_refresh_token,
    })

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        console.log('Refreshing access token for user:', userEmail)
        await supabase
          .from('profiles')
          .update({
            google_calendar_token: tokens.access_token,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
      }
    })

    // Create Calendar API client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    try {
      // Get the list of events
      const result = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const events = result.data.items || []

      return NextResponse.json({
        profile,
        events,
        calendarConnected: true
      })
    } catch (calendarError: any) {
      console.error('Calendar API error:', calendarError)
      console.error('Error details:', {
        message: calendarError.message,
        code: calendarError.code,
        errors: calendarError.errors,
      })

      return NextResponse.json(
        {
          error: `Failed to fetch calendar events: ${calendarError.message}`,
          errorDetails: calendarError.code,
          profile,
          calendarConnected: true
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Admin user calendar API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user calendar data' },
      { status: 500 }
    )
  }
}
