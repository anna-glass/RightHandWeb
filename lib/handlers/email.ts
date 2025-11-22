/**
 * lib/handlers/email.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { sendEmail } from '@/lib/gmail'
import { SendEmailInput, ToolResult } from '@/lib/tools'

/**
 * handleSendEmail
 * sends an email directly via gmail.
 */
export async function handleSendEmail(
  userId: string,
  input: SendEmailInput
): Promise<ToolResult> {
  return sendEmail(userId, {
    to: input.to,
    subject: input.subject,
    body: input.body,
    cc: input.cc,
    bcc: input.bcc
  })
}
