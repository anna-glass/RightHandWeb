import { createDraft, sendDraft, updateDraft } from '@/lib/gmail'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  CreateEmailDraftInput,
  SendPendingDraftInput,
  UpdatePendingDraftInput,
  ToolResult
} from '@/lib/tools'

export async function handleCreateEmailDraft(
  userId: string,
  input: CreateEmailDraftInput
): Promise<ToolResult> {
  const draftResult = await createDraft(userId, {
    to: input.to,
    subject: input.subject,
    body: input.body,
    cc: input.cc,
    bcc: input.bcc
  })

  if (!draftResult.success) {
    return draftResult
  }

  const { error: insertError } = await supabaseAdmin
    .from('pending_email_drafts')
    .insert({
      user_id: userId,
      gmail_draft_id: draftResult.draftId,
      recipient: input.to,
      subject: input.subject
    })

  if (insertError) {
    return {
      success: false,
      error: `Draft created in Gmail but failed to save to database: ${insertError.message}`
    }
  }

  return {
    success: true,
    draftId: draftResult.draftId,
    to: input.to,
    subject: input.subject,
    body: input.body,
    message: "Draft created in Gmail. You MUST now show the user the complete draft in the format: 'to: [email]\\nsubject: [subject]\\nbody: [full body]\\n\\nsend it?' - DO NOT skip showing the draft details."
  }
}

export async function handleSendPendingDraft(
  userId: string,
  input: SendPendingDraftInput
): Promise<ToolResult> {
  let query = supabaseAdmin
    .from('pending_email_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (input?.recipient) {
    query = query.eq('recipient', input.recipient)
  }

  const { data: pendingDrafts, error: queryError } = await query.limit(1)

  if (queryError) {
    return { success: false, error: `Database error: ${queryError.message}` }
  }

  if (!pendingDrafts || pendingDrafts.length === 0) {
    return { success: false, error: 'no pending draft found - make sure you called create_email_draft first' }
  }

  const draft = pendingDrafts[0]
  const sendResult = await sendDraft(userId, draft.gmail_draft_id)

  if (sendResult.success) {
    await supabaseAdmin
      .from('pending_email_drafts')
      .delete()
      .eq('id', draft.id)
  }

  return sendResult
}

export async function handleUpdatePendingDraft(
  userId: string,
  input: UpdatePendingDraftInput
): Promise<ToolResult> {
  let query = supabaseAdmin
    .from('pending_email_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (input?.recipient) {
    query = query.eq('recipient', input.recipient)
  }

  const { data: pendingDrafts } = await query.limit(1)

  if (!pendingDrafts || pendingDrafts.length === 0) {
    return { success: false, error: 'no pending draft found' }
  }

  const draft = pendingDrafts[0]
  const updateResult = await updateDraft(userId, draft.gmail_draft_id, {
    subject: input.subject,
    body: input.body
  })

  if (updateResult.success && input.subject) {
    await supabaseAdmin
      .from('pending_email_drafts')
      .update({ subject: input.subject })
      .eq('id', draft.id)
  }

  return updateResult
}
