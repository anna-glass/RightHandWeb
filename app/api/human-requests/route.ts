/**
 * app/api/human-requests/route.ts
 *
 * Author: Anna Glass
 * Created: 11/22/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendiMessage } from '@/lib/iMessage'
import { randomUUID } from 'crypto'

/**
 * GET /api/human-requests
 * fetches all human requests (admin only).
 */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('human_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ requests: data })
}

/**
 * PATCH /api/human-requests
 * updates a human request status and optionally sends completion notification.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { requestId, status, notes, sendNotification } = body

  if (!requestId || !status) {
    return NextResponse.json({ error: 'requestId and status required' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  }

  if (notes) {
    updateData.admin_notes = notes
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data: request, error: fetchError } = await supabaseAdmin
    .from('human_requests')
    .select('phone_number, title')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('human_requests')
    .update(updateData)
    .eq('id', requestId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (sendNotification && status === 'completed') {
    const message = notes
      ? `hey! your request "${request.title}" has been completed. ${notes}`
      : `hey! your request "${request.title}" has been completed.`

    await sendiMessage(request.phone_number, message, randomUUID())
  }

  return NextResponse.json({ success: true })
}
