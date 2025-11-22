import { supabaseAdmin } from '@/lib/supabase/admin'

const HOURLY_LIMIT = 50

export async function isRateLimited(sender: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await supabaseAdmin
    .from('imessages')
    .select('*', { count: 'exact', head: true })
    .eq('sender', sender)
    .eq('event', 'message.received')
    .gte('created_at', oneHourAgo)

  return (count ?? 0) >= HOURLY_LIMIT
}
