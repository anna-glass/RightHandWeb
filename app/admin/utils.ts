/**
 * app/admin/utils.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

/**
 * formatSmartDate
 * formats date relative to today (time, day name, or date).
 */
export function formatSmartDate(dateString: string | null | undefined): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffTime = today.getTime() - dateOnly.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  })
}

/**
 * formatTime
 * formats date as time string (e.g. "2:30 PM").
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * formatCurrentTime
 * formats current date and time for toolbar display.
 */
export function formatCurrentTime(): string {
  const now = new Date()
  const datePart = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).replace(',', '')
  const timePart = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  return `${datePart} ${timePart}`
}

/**
 * getUserDisplayName
 * returns user's full name or phone number as fallback.
 */
export function getUserDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  phoneNumber: string | null | undefined
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  return phoneNumber || 'User'
}

/**
 * getUserInitials
 * returns user's initials from first and last name.
 */
export function getUserInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`
  }
  return ''
}

/**
 * filterUsers
 * filters users by search query matching name, email, or phone.
 */
export function filterUsers<T extends {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone_number?: string | null
}>(users: T[], searchQuery: string): T[] {
  if (!searchQuery.trim()) return users

  const query = searchQuery.toLowerCase()
  return users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
    const email = user.email?.toLowerCase() || ''
    const phone = user.phone_number?.toLowerCase() || ''
    return fullName.includes(query) || email.includes(query) || phone.includes(query)
  })
}

/**
 * handleRealtimeMessage
 * processes realtime message events and returns updated messages array.
 */
export function handleRealtimeMessage<T extends { message_id?: string | number }>(
  messages: T[],
  eventType: string,
  newRecord: T | null,
  oldRecord: T | null
): T[] {
  if (eventType === 'INSERT' && newRecord) {
    return [...messages, newRecord]
  }
  if (eventType === 'UPDATE' && newRecord) {
    return messages.map(msg =>
      msg.message_id === newRecord.message_id ? newRecord : msg
    )
  }
  if (eventType === 'DELETE' && oldRecord) {
    return messages.filter(msg => msg.message_id !== oldRecord.message_id)
  }
  return messages
}
