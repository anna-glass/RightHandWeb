"use client"

import * as React from "react"
import { Calendar, momentLocalizer, View } from "react-big-calendar"
import moment from "moment"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { cn } from "@/lib/utils"
import { typography } from "@/lib/typography"

const localizer = momentLocalizer(moment)

interface CalendarEvent {
  id: string
  summary: string
  start?: {
    dateTime?: string
    date?: string
  }
  end?: {
    dateTime?: string
    date?: string
  }
  location?: string
  description?: string
  status?: string
}

interface WeekCalendarViewProps {
  events: CalendarEvent[]
  loading?: boolean
}

export function WeekCalendarView({ events, loading }: WeekCalendarViewProps) {
  const [view, setView] = React.useState<View>('week')
  const [date, setDate] = React.useState(new Date())

  // Helper to parse date strings correctly based on whether they're all-day events or timed events
  const parseEventDate = (dateString: string) => {
    // If it's just a date (YYYY-MM-DD) without time, it's an all-day event
    // Parse it in local timezone to avoid timezone shifting
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    // Otherwise it's a dateTime with timezone info, parse normally
    return new Date(dateString)
  }

  // Convert Google Calendar events to react-big-calendar format
  const calendarEvents = React.useMemo(() => {
    return events.map((event) => {
      const startTime = event.start?.dateTime || event.start?.date
      const endTime = event.end?.dateTime || event.end?.date
      const isAllDay = !event.start?.dateTime && !!event.start?.date

      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        start: startTime ? parseEventDate(startTime) : new Date(),
        end: endTime ? parseEventDate(endTime) : new Date(),
        allDay: isAllDay,
        resource: {
          location: event.location,
          description: event.description,
          status: event.status,
        },
      }
    })
  }, [events])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className={cn(typography.body, "text-muted-foreground")}>Loading calendar...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <style jsx global>{`
        .rbc-calendar {
          height: 100%;
          font-family: inherit;
        }

        .rbc-header {
          padding: 12px 4px;
          font-weight: 500;
          border-bottom: 2px solid #e5e7eb;
          background: #fafafa;
        }

        .rbc-today {
          background-color: #fef3c7;
        }

        .rbc-event {
          background-color: #3b82f6;
          border-radius: 4px;
          padding: 2px 5px;
          font-size: 0.875rem;
        }

        .rbc-event:hover {
          background-color: #2563eb;
        }

        .rbc-time-slot {
          min-height: 40px;
        }

        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
        }

        .rbc-timeslot-group {
          border-bottom: 1px solid #e5e7eb;
        }

        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #f3f4f6;
        }

        .rbc-toolbar {
          padding: 16px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
        }

        .rbc-toolbar button {
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .rbc-toolbar button:hover {
          background: #f9fafb;
        }

        .rbc-toolbar button.rbc-active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .rbc-toolbar-label {
          font-weight: 600;
          font-size: 1.125rem;
        }
      `}</style>

      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        style={{ height: '100%' }}
        defaultView="week"
        views={['month', 'week', 'day']}
        step={30}
        showMultiDayTimes
        eventPropGetter={(event: any) => {
          const style: React.CSSProperties = {}

          if (event.resource?.status === 'cancelled') {
            style.backgroundColor = '#9ca3af'
            style.textDecoration = 'line-through'
          }

          return { style }
        }}
        tooltipAccessor={(event: any) => {
          let tooltip = event.title
          if (event.resource?.location) {
            tooltip += `\nLocation: ${event.resource.location}`
          }
          if (event.resource?.description) {
            tooltip += `\n${event.resource.description}`
          }
          return tooltip
        }}
      />
    </div>
  )
}
