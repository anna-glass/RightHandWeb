/**
 * lib/handlers/index.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import {
  handleGetCalendarEvents,
  handleCreateCalendarEvent,
  handleUpdateCalendarEvent,
  handleDeleteCalendarEvent
} from './calendar'
import { handleSendEmail } from './email'
import {
  handleCreateReminder,
  handleListReminders,
  handleCancelReminder
} from './reminders'
import { handleWebSearch } from './search'
import { handleSendSignupLink } from './signup'
import { handleHumanRequest, handleListHumanRequests } from './human-requests'
import {
  SignupLinkInput,
  CalendarEventsInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  DeleteCalendarEventInput,
  SendEmailInput,
  CreateReminderInput,
  CancelReminderInput,
  WebSearchInput,
  HumanRequestInput,
  ToolResult
} from '@/lib/tools'

export interface ToolContext {
  userId: string | null
  phoneNumber: string
  userTimezone: string
}

/**
 * executeToolCall
 * dispatches tool calls to their respective handlers.
 */
export async function executeToolCall(
  toolName: string,
  input: unknown,
  ctx: ToolContext
): Promise<ToolResult> {
  const { userId, phoneNumber, userTimezone } = ctx

  switch (toolName) {
    case 'send_signup_link':
      return handleSendSignupLink(input as SignupLinkInput)

    case 'get_calendar_events':
      return handleGetCalendarEvents(userId!, input as CalendarEventsInput)

    case 'create_calendar_event':
      return handleCreateCalendarEvent(userId!, input as CreateCalendarEventInput)

    case 'update_calendar_event':
      return handleUpdateCalendarEvent(userId!, input as UpdateCalendarEventInput)

    case 'delete_calendar_event':
      return handleDeleteCalendarEvent(userId!, input as DeleteCalendarEventInput)

    case 'send_email':
      return handleSendEmail(userId!, input as SendEmailInput)

    case 'create_reminder':
      return handleCreateReminder(userId!, phoneNumber, userTimezone, input as CreateReminderInput)

    case 'list_reminders':
      return handleListReminders(userId!)

    case 'cancel_reminder':
      return handleCancelReminder(userId!, input as CancelReminderInput)

    case 'web_search':
      return handleWebSearch(input as WebSearchInput)

    case 'request_human_help':
      return handleHumanRequest(userId!, phoneNumber, input as HumanRequestInput)

    case 'list_human_requests':
      return handleListHumanRequests(userId!)

    default:
      return { error: `unknown tool: ${toolName}` }
  }
}
