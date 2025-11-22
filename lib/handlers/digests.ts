import { Client as QstashClient } from '@upstash/qstash'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateCronExpression } from '@/lib/cron'
import { CreateDigestInput, DeleteDigestInput, ToolResult } from '@/lib/tools'

const qstash = new QstashClient({ token: process.env.QSTASH_TOKEN! })

export async function handleCreateDigest(
  userId: string,
  phoneNumber: string,
  input: CreateDigestInput
): Promise<ToolResult> {
  const timeMatch = input.time.match(/^(\d{1,2}):(\d{2})$/)
  if (!timeMatch) {
    return { success: false, error: "time must be in HH:MM format (e.g. '07:00', '14:30')" }
  }

  const send_hour = parseInt(timeMatch[1])
  const send_minute = parseInt(timeMatch[2])

  if (send_hour < 0 || send_hour > 23) {
    return { success: false, error: "hour must be between 0 and 23" }
  }

  if (send_minute < 0 || send_minute > 59) {
    return { success: false, error: "minute must be between 0 and 59" }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single()

  const userTimezone = profile?.timezone || 'America/Los_Angeles'

  const cronExpression = generateCronExpression(
    send_hour,
    send_minute,
    input.frequency,
    input.day_of_month,
    userTimezone
  )

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  const { data: digestData, error } = await supabaseAdmin
    .from('digests')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      prompt: input.prompt,
      qstash_schedule_id: null,
      timezone: userTimezone,
      send_hour,
      send_minute,
      frequency: input.frequency,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create digest: ${error.message}`)
  }

  const scheduleResult = await qstash.schedules.create({
    destination: `${baseUrl}/api/digests/send`,
    cron: cronExpression,
    body: JSON.stringify({
      digestId: digestData.id,
      userId,
      timezone: userTimezone
    })
  })

  const { error: updateError } = await supabaseAdmin
    .from('digests')
    .update({ qstash_schedule_id: scheduleResult.scheduleId })
    .eq('id', digestData.id)

  if (updateError) {
    await qstash.schedules.delete(scheduleResult.scheduleId)
    await supabaseAdmin.from('digests').delete().eq('id', digestData.id)
    throw new Error(`Failed to update digest with schedule ID: ${updateError.message}`)
  }

  const frequencyText = input.frequency === 'weekdays'
    ? 'every weekday'
    : input.frequency === 'weekends'
    ? 'every weekend'
    : input.frequency === 'monthly'
    ? `on day ${input.day_of_month} of each month`
    : input.frequency

  return {
    success: true,
    message: `Digest created! You'll receive "${input.prompt}" ${frequencyText} at ${input.time}`,
    digest_id: digestData.id
  }
}

export async function handleListDigests(userId: string): Promise<ToolResult> {
  const { data: digests, error } = await supabaseAdmin
    .from('digests')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: `Failed to fetch digests: ${error.message}` }
  }

  if (!digests || digests.length === 0) {
    return { success: true, message: "No active digests", digests: [] }
  }

  return {
    success: true,
    digests: digests.map(d => ({
      id: d.id,
      prompt: d.prompt,
      time: `${String(d.send_hour).padStart(2, '0')}:${String(d.send_minute).padStart(2, '0')}`,
      frequency: d.frequency,
      created_at: d.created_at
    }))
  }
}

export async function handleDeleteDigest(
  userId: string,
  input: DeleteDigestInput
): Promise<ToolResult> {
  let { data: digest, error: fetchError } = await supabaseAdmin
    .from('digests')
    .select('id, qstash_schedule_id')
    .eq('id', input.digest_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!digest) {
    const { data: byScheduleId } = await supabaseAdmin
      .from('digests')
      .select('id, qstash_schedule_id')
      .eq('qstash_schedule_id', input.digest_id)
      .eq('user_id', userId)
      .maybeSingle()
    digest = byScheduleId
  }

  if (fetchError || !digest) {
    return { success: false, error: "Digest not found or you don't have permission to delete it" }
  }

  if (digest.qstash_schedule_id) {
    try {
      await qstash.schedules.delete(digest.qstash_schedule_id)
    } catch {}
  }

  const { error: deleteError } = await supabaseAdmin
    .from('digests')
    .delete()
    .eq('id', digest.id)
    .eq('user_id', userId)

  if (deleteError) {
    return { success: false, error: `Failed to delete digest: ${deleteError.message}` }
  }

  return { success: true, message: "Digest deleted" }
}
