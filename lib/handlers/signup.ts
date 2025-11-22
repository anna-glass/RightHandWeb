/**
 * lib/handlers/signup.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendiMessage } from '@/lib/iMessage'
import { formatPhoneNumberE164 } from '@/lib/phone-utils'
import { generateVerificationToken, generateMessageId } from '@/lib/helpers'
import { SignupLinkInput, ToolResult } from '@/lib/tools'

export async function handleSendSignupLink(input: SignupLinkInput): Promise<ToolResult> {
  const formattedPhone = formatPhoneNumberE164(input.phone_number)
  const verificationToken = generateVerificationToken()

  const { data: existing } = await supabaseAdmin
    .from('pending_verifications')
    .select('verification_token')
    .eq('phone_number', formattedPhone)
    .maybeSingle()

  let tokenToUse = verificationToken

  if (existing) {
    tokenToUse = existing.verification_token
  } else {
    const { error } = await supabaseAdmin
      .from('pending_verifications')
      .insert({
        phone_number: formattedPhone,
        verification_token: verificationToken,
        created_at: new Date().toISOString()
      })

    if (error) {
      throw new Error('Failed to create signup link')
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const verificationUrl = `${baseUrl}/verify/${tokenToUse}`

  await sendiMessage(formattedPhone, verificationUrl, generateMessageId())

  return { success: true, message: "Signup link sent successfully", url: verificationUrl }
}
