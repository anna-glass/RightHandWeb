/**
 * lib/qstash.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'

type VerifyResult =
  | { ok: true; body: string }
  | { ok: false; error: NextResponse }

/** Verifies QStash signature in production, skips in dev. */
export async function verifyQStashRequest(req: NextRequest): Promise<VerifyResult> {
  const body = await req.text()

  if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    })

    const signature = req.headers.get('upstash-signature')
    if (!signature) {
      return { ok: false, error: NextResponse.json({ error: 'Missing signature' }, { status: 401 }) }
    }

    try {
      await receiver.verify({ signature, body })
    } catch {
      return { ok: false, error: NextResponse.json({ error: 'Invalid signature' }, { status: 401 }) }
    }
  } else if (process.env.NODE_ENV !== 'development') {
    return { ok: false, error: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }) }
  }

  return { ok: true, body }
}
