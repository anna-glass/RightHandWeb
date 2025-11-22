'use server'

import { createClient } from '@/lib/supabase/server'
import { formatPhoneNumberE164 } from '@/lib/phone-utils'

interface UpdateProfileData {
  first_name: string
  last_name: string
  phone_number: string
  avatar_url?: string
}

/** Updates the current user's profile. */
export async function updateProfile(data: UpdateProfileData) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: formatPhoneNumberE164(data.phone_number),
        avatar_url: data.avatar_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update profile' }
  }
}
