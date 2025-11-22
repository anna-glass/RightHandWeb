import { Client as QstashClient } from '@upstash/qstash'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTimezoneOffset } from '@/lib/helpers'
import { CreateReminderInput, CancelReminderInput, ToolResult } from '@/lib/tools'

const qstash = new QstashClient({ token: process.env.QSTASH_TOKEN! })

export async function handleCreateReminder(
  userId: string,
  phoneNumber: string,
  userTimezone: string,
  input: CreateReminderInput
): Promise<ToolResult> {
  let reminderTime: Date
  if (input.time.includes('Z') || input.time.match(/[+-]\d{2}:\d{2}$/)) {
    reminderTime = new Date(input.time)
  } else {
    const timeWithTZ = input.time + getTimezoneOffset(userTimezone)
    reminderTime = new Date(timeWithTZ)
  }

  const delaySeconds = Math.floor((reminderTime.getTime() - Date.now()) / 1000)

  if (delaySeconds <= 0) {
    return { success: false, error: "Reminder time must be in the future" }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  const qstashResponse = await qstash.publishJSON({
    url: `${baseUrl}/api/reminders/callback`,
    delay: delaySeconds,
    body: {
      phoneNumber,
      intent: input.intent,
      userId,
      reminderId: 'TEMP_ID'
    }
  })

  const messageId = Array.isArray(qstashResponse) ? qstashResponse[0].messageId : qstashResponse.messageId

  const { data: reminderData, error: dbError } = await supabaseAdmin
    .from('reminders')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      intent: input.intent,
      scheduled_time: reminderTime.toISOString(),
      qstash_message_id: messageId,
      is_sent: false
    })
    .select()
    .single()

  if (dbError) {
    try {
      await fetch(`https://qstash.upstash.io/v2/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.QSTASH_TOKEN}` }
      })
    } catch {}
    throw new Error(`Failed to store reminder: ${dbError.message}`)
  }

  return {
    success: true,
    message: `Reminder set for ${reminderTime.toLocaleString()}`,
    reminder_id: reminderData.id
  }
}

export async function handleListReminders(userId: string): Promise<ToolResult> {
  const { data: reminders, error } = await supabaseAdmin
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('is_sent', false)
    .order('scheduled_time', { ascending: true })

  if (error) {
    return { success: false, error: `Failed to fetch reminders: ${error.message}` }
  }

  if (!reminders || reminders.length === 0) {
    return { success: true, message: "No pending reminders", reminders: [] }
  }

  return {
    success: true,
    reminders: reminders.map(r => ({
      id: r.id,
      intent: r.intent,
      scheduled_time: r.scheduled_time,
      created_at: r.created_at
    }))
  }
}

export async function handleCancelReminder(
  userId: string,
  input: CancelReminderInput
): Promise<ToolResult> {
  const { data: reminder, error: fetchError } = await supabaseAdmin
    .from('reminders')
    .select('qstash_message_id, is_sent')
    .eq('id', input.reminder_id)
    .eq('user_id', userId)
    .single()

  if (fetchError || !reminder) {
    return { success: false, error: "Reminder not found or you don't have permission to cancel it" }
  }

  if (reminder.is_sent) {
    return { success: false, error: "Reminder already sent, can't cancel" }
  }

  await fetch(`https://qstash.upstash.io/v2/messages/${reminder.qstash_message_id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${process.env.QSTASH_TOKEN}` }
  })

  const { error: deleteError } = await supabaseAdmin
    .from('reminders')
    .delete()
    .eq('id', input.reminder_id)
    .eq('user_id', userId)

  if (deleteError) {
    return { success: false, error: `Failed to delete reminder: ${deleteError.message}` }
  }

  return { success: true, message: "Reminder canceled" }
}
