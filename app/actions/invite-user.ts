'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function inviteUser(email: string) {
  try {
    const supabase = createAdminClient()

    // Get the app URL for the redirect - must be absolute URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectTo = `${appUrl}/create-account`

    // Invite the user with the redirect URL
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    // Create the profile for the invited member (all invited users are members)
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: null,
          last_name: null,
          hours_saved_this_month: 0,
          tasks_this_month: 0
        })

      if (profileError) {
        // If profile creation fails, we should still consider it a success
        // since the user was invited
        return { success: false, error: 'User invited but profile creation failed. Please contact support.' }
      }
    }

    return { success: true, data: authData }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to invite user' }
  }
}
