import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendiMessage } from '@/lib/iMessage'
import { generateMessageId } from '@/lib/helpers'
import { verifyQStashRequest } from '@/lib/qstash'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/reminders/callback
 * called by qstash to send a scheduled reminder to user.
 */
export async function POST(req: NextRequest) {
  try {
    const verified = await verifyQStashRequest(req)
    if (!verified.ok) return verified.error

    const { phoneNumber, intent, reminderId } = JSON.parse(verified.body)

    await sendiMessage(phoneNumber, intent, generateMessageId())

    if (reminderId && reminderId !== 'TEMP_ID') {
      await supabaseAdmin
        .from('reminders')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', reminderId)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to process reminder' }, { status: 500 })
  }
}
