import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '@/lib/google-calendar'
import {
  CalendarEventsInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  DeleteCalendarEventInput,
  ToolResult
} from '@/lib/tools'

export async function handleGetCalendarEvents(
  userId: string,
  input: CalendarEventsInput
): Promise<ToolResult> {
  return getCalendarEvents(userId, input.start_date, input.end_date)
}

export async function handleCreateCalendarEvent(
  userId: string,
  input: CreateCalendarEventInput
): Promise<ToolResult> {
  return createCalendarEvent(userId, input)
}

export async function handleUpdateCalendarEvent(
  userId: string,
  input: UpdateCalendarEventInput
): Promise<ToolResult> {
  return updateCalendarEvent(userId, input.event_id, {
    summary: input.summary,
    start: input.start,
    end: input.end,
    description: input.description,
    location: input.location,
    attendees: input.attendees
  })
}

export async function handleDeleteCalendarEvent(
  userId: string,
  input: DeleteCalendarEventInput
): Promise<ToolResult> {
  return deleteCalendarEvent(userId, input.event_id)
}
