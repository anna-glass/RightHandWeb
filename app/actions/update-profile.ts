'use server'

import { createClient } from '@/lib/supabase/server'

interface UpdateProfileData {
  first_name: string
  last_name: string
  phone_number: string
  avatar_url?: string
}

export async function updateProfile(data: UpdateProfileData) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        avatar_url: data.avatar_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update profile' }
  }
}
