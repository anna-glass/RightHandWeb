import { NextRequest, NextResponse } from 'next/server'
import { Client as QstashClient } from '@upstash/qstash'
import { insertMessage } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const qstash = new QstashClient({ token: process.env.QSTASH_TOKEN! })

interface BlooioWebhookPayload {
  event: string
  message_id: string
  external_id: string
  text: string
  attachments: unknown[]
  protocol: string
  device_id: string
}

/**
 * POST /api/webhooks/blooio
 * Receives incoming iMessage events from Blooio, saves to db, queues processing.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: BlooioWebhookPayload = await request.json()
    const eventType = request.headers.get('x-blooio-event') || payload.event

    // only process message events
    if (eventType !== 'message.sent' && eventType !== 'message.received') {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    if (!payload.message_id || !payload.external_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // save message to db (blooio sends phone in E164 format)
    const { error: insertError } = await insertMessage({
      event: eventType,
      message_id: payload.message_id,
      sender: payload.external_id,
      text: payload.text,
      attachments: payload.attachments,
      protocol: payload.protocol,
      device_id: payload.device_id,
    })

    // handle duplicate messages (blooio may retry)
    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, duplicate: true }, { status: 200 })
      }
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // queue processing for received messages
    if (eventType === 'message.received') {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
      try {
        await qstash.publishJSON({
          url: `${baseUrl}/api/process-message`,
          body: {
            messageId: payload.message_id,
            sender: payload.external_id,
            text: payload.text
          }
        })
      } catch {}
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    // return 200 so blooio doesn't retry
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
