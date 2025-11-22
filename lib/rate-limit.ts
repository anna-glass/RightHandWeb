import { countMessagesSince } from '@/lib/db'

const HOURLY_LIMIT = 50

export async function isRateLimited(sender: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const count = await countMessagesSince(sender, oneHourAgo)
  return count >= HOURLY_LIMIT
}
