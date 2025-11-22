/**
 * app/api/digests/send/route.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClaudeResponse } from '@/lib/claude'
import { getAuthenticatedSystemPrompt } from '@/lib/system-prompts'
import { sendiMessage } from '@/lib/iMessage'
import { generateMessageId } from '@/lib/helpers'
import { AUTHENTICATED_TOOLS } from '@/lib/tools'
import { verifyQStashRequest } from '@/lib/qstash'
import { getDigestForSend, markDigestSent } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/digests/send
 * Called by QStash cron to send scheduled digests to users.
 */
export async function POST(req: NextRequest) {
  try {
    const verified = await verifyQStashRequest(req)
    if (!verified.ok) return verified.error

    const { digestId, userId, timezone } = JSON.parse(verified.body || '{}')

    if (!digestId || !userId) {
      return NextResponse.json({ error: 'Missing digestId or userId' }, { status: 400 })
    }

    const { data: digest, error: digestError } = await getDigestForSend(digestId, userId)

    if (digestError || !digest) {
      return NextResponse.json({ error: 'Digest not found or inactive' }, { status: 404 })
    }

    const userName = digest.profiles.first_name || 'User'
    const userCity = digest.profiles.city || null
    const userTimezone = timezone || digest.timezone

    // generate digest with claude
    const digestPrompt = `This is the user's scheduled ${digest.frequency} digest. The user asked for: "${digest.prompt}". Start your response with a brief greeting acknowledging this is their ${digest.frequency} update, then provide the info.`
    const systemPrompt = getAuthenticatedSystemPrompt(userTimezone, userName, userCity)

    const digestContent = await getClaudeResponse(
      systemPrompt,
      [{ role: "user", content: digestPrompt }],
      AUTHENTICATED_TOOLS,
      { userId, phoneNumber: digest.phone_number, userTimezone }
    )

    await sendiMessage(digest.phone_number, digestContent, generateMessageId())
    await markDigestSent(digestId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to process digests' }, { status: 500 })
  }
}
