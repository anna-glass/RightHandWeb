/**
 * app/verify/[token]/utils.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { SupabaseClient, Session } from "@supabase/supabase-js"
import { strings } from "@/lib/strings"

/** parses first/last name from google user metadata */
function parseUserName(fullName?: string): { firstName?: string; lastName?: string } {
  if (!fullName) return {}
  const parts = fullName.split(' ')
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined
  }
}

/** creates user profile after successful google oauth */
export async function createProfileFromOAuth(
  supabase: SupabaseClient,
  session: Session,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  const user = session.user
  const { firstName, lastName } = parseUserName(user.user_metadata?.full_name)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email || '',
      phone_number: phoneNumber,
      verified: true,
      google_calendar_token: session.provider_token,
      google_refresh_token: session.provider_refresh_token || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      first_name: firstName || null,
      last_name: lastName || null,
      timezone,
    })

  if (insertError) {
    console.error('Failed to create profile:', insertError)
    return { success: false, error: strings.verify.errors.setupFailed }
  }

  // link past messages to this profile (non-blocking)
  const { error: linkError } = await supabase
    .from('imessages')
    .update({ profile_id: user.id })
    .eq('sender', phoneNumber)
    .is('profile_id', null)

  if (linkError) {
    console.error('Failed to link past messages:', linkError)
  }

  return { success: true }
}

/** triggers bounce animation on progress bar */
export function animateProgressBar() {
  const overlay = document.getElementById('progress-overlay')
  if (overlay) {
    overlay.classList.remove('animate-bounce-quick')
    void overlay.offsetWidth // trigger reflow
    overlay.classList.add('animate-bounce-quick')
    setTimeout(() => overlay.classList.remove('animate-bounce-quick'), 500)
  }
}
