/**
 * app/admin/types.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

export interface UserProfile {
  id: string
  email?: string | null
  phone_number?: string | null
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  created_at?: string | null
}

export interface Message {
  message_id?: string | number
  event?: string
  text?: string
  sender?: string
  created_at?: string
  content?: string
}
