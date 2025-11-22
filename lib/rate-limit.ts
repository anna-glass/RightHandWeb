/**
 * lib/rate-limit.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { countMessagesSince } from '@/lib/db'

const HOURLY_LIMIT = 50

export async function isRateLimited(sender: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const count = await countMessagesSince(sender, oneHourAgo)
  return count >= HOURLY_LIMIT
}
