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

export interface HumanRequest {
  id: string
  user_id: string
  phone_number: string
  request_type: 'reservation' | 'appointment' | 'payment' | 'other'
  title: string
  details: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  admin_notes?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
  user?: UserProfile | null
}
