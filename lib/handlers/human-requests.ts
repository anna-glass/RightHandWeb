/**
 * lib/handlers/human-requests.ts
 *
 * Author: Anna Glass
 * Created: 11/22/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { HumanRequestInput, ToolResult } from '@/lib/tools'

/**
 * handleHumanRequest
 * creates a human request for tasks requiring human assistance.
 */
export async function handleHumanRequest(
  userId: string,
  phoneNumber: string,
  input: HumanRequestInput
): Promise<ToolResult> {
  const { data, error } = await supabaseAdmin
    .from('human_requests')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      request_type: input.request_type,
      title: input.title,
      details: input.details,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to create request: ${error.message}` }
  }

  return {
    success: true,
    message: "Request submitted! A human assistant will handle this and you'll get a notification when it's done.",
    request_id: data.id
  }
}

/**
 * handleListHumanRequests
 * lists all human requests for the user.
 */
export async function handleListHumanRequests(userId: string): Promise<ToolResult> {
  const { data: requests, error } = await supabaseAdmin
    .from('human_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: `Failed to fetch requests: ${error.message}` }
  }

  if (!requests || requests.length === 0) {
    return { success: true, message: "No human requests yet", requests: [] }
  }

  return {
    success: true,
    requests: requests.map(r => ({
      id: r.id,
      request_type: r.request_type,
      title: r.title,
      details: r.details,
      status: r.status,
      created_at: r.created_at,
      completed_at: r.completed_at,
      admin_notes: r.admin_notes
    }))
  }
}
