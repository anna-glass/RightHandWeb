/**
 * lib/google-auth.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import { SupabaseClient } from "@supabase/supabase-js"
import { GOOGLE_OAUTH_SCOPES } from "@/lib/constants"
import { strings } from "@/lib/strings"

/**
 * initiates google oauth for simple sign-in (no special scopes).
 * used on /signin for returning users.
 */
export async function signInWithGoogle(
  supabase: SupabaseClient,
  redirectTo: string
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error) {
    console.error('Google sign-in error:', error)
    return { error: error.message }
  }

  return {}
}

/**
 * initiates google oauth with full calendar/gmail scopes.
 * used on /verify for onboarding new users who need offline access.
 */
export async function connectGoogleAccount(
  supabase: SupabaseClient,
  redirectTo: string
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: GOOGLE_OAUTH_SCOPES,
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('Google connect error:', error)
    return { error: strings.verify.errors.googleFailed }
  }

  return {}
}
