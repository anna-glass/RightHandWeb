import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const isSignup = requestUrl.searchParams.get('signup') === 'true'
  const origin = requestUrl.origin

  console.log('Auth callback - URL:', requestUrl.toString())
  console.log('Auth callback - Code present:', !!code)
  console.log('Auth callback - Is signup:', isSignup)

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Auth callback - Code exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    if (!session?.user) {
      console.error('Auth callback - No user in session')
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    const user = session.user
    console.log('Auth callback - User authenticated:', user.email)

    // Check if this is a sign-up flow
    if (isSignup) {
      console.log('Auth callback - Sign up flow detected')

      // For sign up, create profile if it doesn't exist
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
          // If profile creation fails, delete the auth user and redirect with error
          const adminClient = createAdminClient()
          await adminClient.auth.admin.deleteUser(user.id)
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`)
        }
      }

      // Redirect to verified page for new users
      console.log('Auth callback - Redirecting to verified page')
      return NextResponse.redirect(`${origin}/auth/verified`)
    } else {
      console.log('Auth callback - Sign in flow detected')

      // For sign in, check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.log('Auth callback - No profile found for user, unauthorized')

        // Delete the auth user since they don't have a profile
        const adminClient = createAdminClient()
        await adminClient.auth.admin.deleteUser(user.id)
        await supabase.auth.signOut()

        return NextResponse.redirect(`${origin}/login?error=unauthorized`)
      }

      // Profile exists, redirect to home
      console.log('Auth callback - Profile found, redirecting to home')
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // No code provided, redirect to login with error
  console.error('Auth callback - No code in URL')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
