import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Verify Qstash signature if keys are available
    if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
      const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
      })

      const signature = req.headers.get('upstash-signature')
      const body = await req.text()

      if (!signature) {
        console.error('Missing Qstash signature')
        return NextResponse.json(
          { error: 'Missing signature' },
          { status: 401 }
        )
      }

      try {
        await receiver.verify({
          signature,
          body,
        })
      } catch (error) {
        console.error('Invalid Qstash signature:', error)
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }

      // Parse the verified body
      const { phoneNumber, intent, reminderId } = JSON.parse(body)

      console.log('📅 Reminder callback received (verified):', { phoneNumber, intent, reminderId })

      // Send reminder message via Blooio
      const res = await fetch('https://backend.blooio.com/v1/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BLOOIO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          text: intent
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to send reminder via Blooio:', res.status, errorText)
        return NextResponse.json(
          { error: 'Failed to send reminder' },
          { status: 500 }
        )
      }

      // Mark reminder as sent in database
      if (reminderId && reminderId !== 'TEMP_ID') {
        await supabase
          .from('reminders')
          .update({
            is_sent: true,
            sent_at: new Date().toISOString()
          })
          .eq('id', reminderId)
      }

      console.log('✅ Reminder sent successfully')
      return NextResponse.json({ success: true }, { status: 200 })
    } else {
      // Development mode - no signature verification
      console.warn('⚠️ Running without Qstash signature verification (development mode)')

      const { phoneNumber, intent, reminderId } = await req.json()

      console.log('📅 Reminder callback received (unverified):', { phoneNumber, intent, reminderId })

      // Send reminder message via Blooio
      const res = await fetch('https://backend.blooio.com/v1/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BLOOIO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          text: intent
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to send reminder via Blooio:', res.status, errorText)
        return NextResponse.json(
          { error: 'Failed to send reminder' },
          { status: 500 }
        )
      }

      // Mark reminder as sent in database
      if (reminderId && reminderId !== 'TEMP_ID') {
        await supabase
          .from('reminders')
          .update({
            is_sent: true,
            sent_at: new Date().toISOString()
          })
          .eq('id', reminderId)
      }

      console.log('✅ Reminder sent successfully')
      return NextResponse.json({ success: true }, { status: 200 })
    }
  } catch (error) {
    console.error('Error in reminder callback:', error)
    return NextResponse.json(
      { error: 'Failed to process reminder' },
      { status: 500 }
    )
  }
}
