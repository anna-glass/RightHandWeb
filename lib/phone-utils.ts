/**
 * lib/phone-utils.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

/**
 * formatPhoneNumberE164
 * converts phone number to E.164 format for blooio.
 */
export function formatPhoneNumberE164(phoneNumber: string): string {
  if (!phoneNumber) {
    return phoneNumber
  }

  // Remove all non-digit characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')

  // If it already starts with +, return as-is (assume it's already E.164)
  if (cleaned.startsWith('+')) {
    return cleaned
  }

  // If it starts with 1 and is 11 digits, add the + prefix (US/Canada number)
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return '+' + cleaned
  }

  // If it's 10 digits, assume US/Canada and add +1 prefix
  if (cleaned.length === 10) {
    return '+1' + cleaned
  }

  // If it doesn't match known patterns, add + prefix and hope for the best
  // (This handles cases where the number might already be in the right format but missing +)
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned
  }

  return cleaned
}
