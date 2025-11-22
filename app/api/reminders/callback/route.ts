/**
 * app/api/reminders/callback/route.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendiMessage } from '@/lib/iMessage'
import { generateMessageId } from '@/lib/helpers'
import { verifyQStashRequest } from '@/lib/qstash'
import { markReminderSent } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/reminders/callback
 * Called by QStash to send a scheduled reminder to user.
 */
export async function POST(req: NextRequest) {
  try {
    const verified = await verifyQStashRequest(req)
    if (!verified.ok) return verified.error

    const { phoneNumber, intent, reminderId } = JSON.parse(verified.body)

    await sendiMessage(phoneNumber, intent, generateMessageId())

    if (reminderId && reminderId !== 'TEMP_ID') {
      await markReminderSent(reminderId)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to process reminder' }, { status: 500 })
  }
}
