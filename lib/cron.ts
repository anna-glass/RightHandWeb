/**
 * lib/cron.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

export type Frequency = 'hourly' | 'daily' | 'weekdays' | 'weekends' | 'monthly'

export function generateCronExpression(
  localHour: number,
  localMinute: number,
  frequency: Frequency,
  dayOfMonth?: number,
  timezone: string = 'America/Los_Angeles'
): string {
  switch (frequency) {
    case 'hourly':
      return `CRON_TZ=${timezone} ${localMinute} * * * *`
    case 'daily':
      return `CRON_TZ=${timezone} ${localMinute} ${localHour} * * *`
    case 'weekdays':
      return `CRON_TZ=${timezone} ${localMinute} ${localHour} * * 1-5`
    case 'weekends':
      return `CRON_TZ=${timezone} ${localMinute} ${localHour} * * 0,6`
    case 'monthly':
      if (dayOfMonth === undefined) throw new Error('day_of_month required for monthly')
      return `CRON_TZ=${timezone} ${localMinute} ${localHour} ${dayOfMonth} * *`
    default:
      throw new Error(`Invalid frequency: ${frequency}`)
  }
}
