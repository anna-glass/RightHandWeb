import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('Auth callback - URL:', requestUrl.toString())
  console.log('Auth callback - Code present:', !!code)

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Auth callback - Code exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/?error=auth_failed`)
    }

    if (!session?.user) {
      console.error('Auth callback - No user in session')
      return NextResponse.redirect(`${origin}/?error=auth_failed`)
    }

    const user = session.user
    console.log('Auth callback - User authenticated:', user.email)

    // Create profile if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      console.log('Auth callback - Creating profile for new user')
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          avatar_url: user.user_metadata?.avatar_url || null,
          onboarding_completed: false
        })

      if (profileError) {
        console.error('Auth callback - Profile creation error:', profileError)
        // If profile creation fails, sign out and redirect with error
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/?error=profile_creation_failed`)
      }
    }

    // Redirect to verification page for new users
    console.log('Auth callback - Redirecting to verification page')
    return NextResponse.redirect(`${origin}/verification`)
  }

  // No code provided, redirect to home with error
  console.error('Auth callback - No code in URL')
  return NextResponse.redirect(`${origin}/?error=no_code`)
}
