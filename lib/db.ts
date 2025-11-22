/**
 * lib/db.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

/** Get profile by phone number. */
export async function getProfileByPhone(phone: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, timezone, first_name, last_name, city')
    .eq('phone_number', phone)
    .maybeSingle()
  return data
}

/** Get profile by user ID. */
export async function getProfileById(userId: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

/** Get profile with Google tokens. */
export async function getProfileWithTokens(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('google_calendar_token, google_refresh_token, email, timezone')
    .eq('id', userId)
    .single()
  if (error) throw new Error('User profile not found')
  return data
}

/** Update Google access token after refresh. */
export async function updateGoogleToken(userId: string, token: string) {
  await supabaseAdmin
    .from('profiles')
    .update({ google_calendar_token: token })
    .eq('id', userId)
}

// ============================================================================
// pending_verifications
// ============================================================================

/** Check if phone has a pending verification. */
export async function hasPendingVerification(phone: string) {
  const { data } = await supabaseAdmin
    .from('pending_verifications')
    .select('verification_token')
    .eq('phone_number', phone)
    .maybeSingle()
  return !!data
}

/** Get pending verification by phone. */
export async function getPendingVerificationByPhone(phone: string) {
  const { data } = await supabaseAdmin
    .from('pending_verifications')
    .select('verification_token')
    .eq('phone_number', phone)
    .maybeSingle()
  return data
}

/** Create pending verification. */
export async function createPendingVerification(phone: string, token: string) {
  const { error } = await supabaseAdmin
    .from('pending_verifications')
    .insert({
      phone_number: phone,
      verification_token: token,
      created_at: new Date().toISOString()
    })
  if (error) throw new Error('Failed to create signup link')
}

// ============================================================================
// imessages
// ============================================================================

/** Insert a new message. */
export async function insertMessage(data: {
  event: string
  message_id: string
  sender: string
  text: string
  attachments: unknown[]
  protocol: string
  device_id: string
}) {
  const { error } = await supabaseAdmin
    .from('imessages')
    .insert({ ...data, profile_id: null })
  return { error }
}

/** Get recent messages for conversation history. */
export async function getRecentMessages(phone: string, since: string) {
  const { data } = await supabaseAdmin
    .from('imessages')
    .select('event, text, created_at')
    .eq('sender', phone)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
  return data || []
}

/** Count messages in time window (for rate limiting). */
export async function countMessagesSince(phone: string, since: string) {
  const { count } = await supabaseAdmin
    .from('imessages')
    .select('*', { count: 'exact', head: true })
    .eq('sender', phone)
    .eq('event', 'message.received')
    .gte('created_at', since)
  return count ?? 0
}

// ============================================================================
// reminders
// ============================================================================

/** Mark reminder as sent. */
export async function markReminderSent(reminderId: string) {
  await supabaseAdmin
    .from('reminders')
    .update({ is_sent: true, sent_at: new Date().toISOString() })
    .eq('id', reminderId)
}

// ============================================================================
// digests
// ============================================================================

/** Get digest with profile for sending. */
export async function getDigestForSend(digestId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('digests')
    .select('*, profiles!inner(id, first_name, city)')
    .eq('id', digestId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  return { data, error }
}

/** Update digest last_sent_at. */
export async function markDigestSent(digestId: string) {
  await supabaseAdmin
    .from('digests')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('id', digestId)
}
