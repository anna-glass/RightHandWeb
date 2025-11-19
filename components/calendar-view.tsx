"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { typography } from "@/lib/typography"
import { Calendar, Clock, MapPin } from "lucide-react"

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

interface CalendarViewProps {
  events: CalendarEvent[]
  loading?: boolean
}

export function CalendarView({ events, loading }: CalendarViewProps) {
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

  const formatDate = (dateString: string | undefined, isAllDay: boolean = false) => {
    if (!dateString) return 'No date'
    const date = parseEventDate(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return ''
    const date = parseEventDate(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getEventDuration = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return ''
    const startDate = parseEventDate(start)
    const endDate = parseEventDate(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
      return `${diffMins}m`
    } else {
      const hours = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
  }

  const isAllDayEvent = (event: CalendarEvent) => {
    return !event.start?.dateTime && !!event.start?.date
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-muted-foreground")}>Loading calendar...</p>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <p className={cn(typography.body, "text-muted-foreground")}>No upcoming events</p>
      </div>
    )
  }

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const dateString = event.start?.dateTime || event.start?.date
    if (!dateString) return acc

    const date = formatDate(dateString)
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date} className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h3 className={cn(typography.bodySmall, "font-medium text-muted-foreground")}>
              {date}
            </h3>
          </div>

          <div className="space-y-2">
            {dateEvents.map((event) => {
              const isAllDay = isAllDayEvent(event)
              const startTime = event.start?.dateTime || event.start?.date
              const endTime = event.end?.dateTime || event.end?.date
              const duration = !isAllDay ? getEventDuration(startTime, endTime) : null

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn(typography.bodySmall, "font-medium")}>
                        {event.summary || 'Untitled Event'}
                      </h4>
                      {event.status === 'cancelled' && (
                        <span className="text-xs text-red-500 font-medium">Cancelled</span>
                      )}
                    </div>

                    {startTime && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span className={cn(typography.caption)}>
                          {isAllDay ? (
                            'All day'
                          ) : (
                            <>
                              {formatTime(startTime)}
                              {endTime && ` - ${formatTime(endTime)}`}
                              {duration && ` (${duration})`}
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {event.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className={cn(typography.caption, "truncate")}>
                          {event.location}
                        </span>
                      </div>
                    )}

                    {event.description && (
                      <p className={cn(typography.caption, "text-muted-foreground mt-2 line-clamp-2")}>
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
