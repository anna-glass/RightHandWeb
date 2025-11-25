/**
 * lib/tools.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import Anthropic from '@anthropic-ai/sdk'

export interface SignupLinkInput {
  phone_number: string
}

export interface CalendarEventsInput {
  start_date: string
  end_date?: string
}

export interface CreateCalendarEventInput {
  summary: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: string
}

export interface UpdateCalendarEventInput {
  event_id: string
  summary?: string
  start?: string
  end?: string
  description?: string
  location?: string
  attendees?: string
}

export interface DeleteCalendarEventInput {
  event_id: string
}

export interface SendEmailInput {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
}

export interface CreateReminderInput {
  intent: string
  time: string
}

export interface CancelReminderInput {
  reminder_id: string
}

export interface WebSearchInput {
  query: string
}

export interface HumanRequestInput {
  request_type: 'reservation' | 'appointment' | 'payment' | 'other'
  title: string
  details: string
}

export interface ToolResult {
  success?: boolean
  error?: string
  message?: string
  [key: string]: unknown
}

export const AUTHENTICATED_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_calendar_events",
    description: "view calendar events for a date or date range",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "start date in YYYY-MM-DD format" },
        end_date: { type: "string", description: "end date in YYYY-MM-DD format (optional, defaults to same day)" }
      },
      required: ["start_date"]
    }
  },
  {
    name: "create_calendar_event",
    description: "create a new calendar event with optional attendees. can invite people by email",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "event title/summary" },
        start: { type: "string", description: "start time as ISO datetime (e.g. 2025-01-20T14:00:00) or date (2025-01-20) for all-day" },
        end: { type: "string", description: "end time as ISO datetime or date" },
        description: { type: "string", description: "event description (optional)" },
        location: { type: "string", description: "event location (optional)" },
        attendees: { type: "string", description: "comma-separated list of attendee email addresses who will receive calendar invites (optional). example: 'alice@example.com,bob@example.com'" }
      },
      required: ["summary", "start", "end"]
    }
  },
  {
    name: "update_calendar_event",
    description: "update an existing calendar event",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "id of the event to update" },
        summary: { type: "string", description: "new event title (optional)" },
        start: { type: "string", description: "new start time (optional)" },
        end: { type: "string", description: "new end time (optional)" },
        description: { type: "string", description: "new description (optional)" },
        location: { type: "string", description: "new location (optional)" },
        attendees: { type: "string", description: "comma-separated list of attendee email addresses (optional). replaces existing attendees. empty string removes all attendees" }
      },
      required: ["event_id"]
    }
  },
  {
    name: "delete_calendar_event",
    description: "delete a calendar event",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "id of the event to delete" }
      },
      required: ["event_id"]
    }
  },
  {
    name: "send_email",
    description: "send an email. ONLY use after: 1) you composed and showed a draft to the user, and 2) they confirmed (yes, send it, looks good, etc). pass the exact email content you showed them",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "recipient email address" },
        subject: { type: "string", description: "email subject line" },
        body: { type: "string", description: "email body text" },
        cc: { type: "string", description: "cc email addresses (optional)" },
        bcc: { type: "string", description: "bcc email addresses (optional)" }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    name: "create_reminder",
    description: "create a reminder to notify the user at a specific time",
    input_schema: {
      type: "object",
      properties: {
        intent: { type: "string", description: "the reminder message sent to user. should start with 'reminding you to' or 'hey, time to' or similar prefix so they know it's a reminder. examples: 'reminding you to pick up halle!', 'hey, time to call mom', 'reminder: take your meds'" },
        time: { type: "string", description: "when to send the reminder as ISO datetime (e.g. 2025-01-20T14:00:00)" }
      },
      required: ["intent", "time"]
    }
  },
  {
    name: "list_reminders",
    description: "list all pending reminders for the user. use when user asks what reminders they have or wants to see their scheduled reminders",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "cancel_reminder",
    description: "cancel a pending reminder. use when user wants to cancel or delete a reminder",
    input_schema: {
      type: "object",
      properties: {
        reminder_id: { type: "string", description: "id of the reminder to cancel (get from list_reminders)" }
      },
      required: ["reminder_id"]
    }
  },
  {
    name: "web_search",
    description: "search the internet for current information. use for weather, news, sports scores, facts, recommendations, current events, or any question requiring up-to-date info",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "the search query (include location for local queries like weather)" }
      },
      required: ["query"]
    }
  },
  {
    name: "request_human_help",
    description: "route a task to a human assistant for things you can't do directly like booking reservations, making appointments, paying parking tickets, or other tasks requiring human action. gather all necessary details from the user first (dates, times, preferences, confirmation numbers, etc), then use this tool to submit the request",
    input_schema: {
      type: "object",
      properties: {
        request_type: {
          type: "string",
          description: "type of request",
          enum: ["reservation", "appointment", "payment", "other"]
        },
        title: { type: "string", description: "brief title summarizing the request (e.g. 'dinner reservation at carbone for saturday')" },
        details: { type: "string", description: "all details needed to complete the request: dates, times, party size, preferences, confirmation numbers, contact info, any special instructions" }
      },
      required: ["request_type", "title", "details"]
    }
  },
  {
    name: "list_human_requests",
    description: "list all human assistance requests (both pending and completed). use when user asks about status of requests you routed to a human",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  }
]

export function getTools(isAuthenticated: boolean): Anthropic.Tool[] {
  const signupTool: Anthropic.Tool = {
    name: "send_signup_link",
    description: isAuthenticated
      ? "Send a signup link (but user is already signed up, so you probably don't need this)"
      : "Send a signup/verification link to a new user. Only use when user expresses interest in signing up or using Right Hand's services.",
    input_schema: {
      type: "object",
      properties: {
        phone_number: { type: "string", description: "The user's phone number" }
      },
      required: ["phone_number"]
    }
  }

  return isAuthenticated ? [signupTool, ...AUTHENTICATED_TOOLS] : [signupTool]
}

