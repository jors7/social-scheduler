import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the start of a day in UTC
 * Used for consistent date filtering across frontend/backend
 */
export function startOfDayUTC(date: Date = new Date()): Date {
  const utc = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ))
  return utc
}

/**
 * Get the end of a day in UTC (23:59:59.999)
 * Used for consistent date filtering across frontend/backend
 */
export function endOfDayUTC(date: Date = new Date()): Date {
  const utc = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23, 59, 59, 999
  ))
  return utc
}

/**
 * Get a date N days ago, normalized to start of day in UTC
 * Used for "last N days" date range calculations
 */
export function daysAgoUTC(days: number): Date {
  const now = new Date()
  const date = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - days,
    0, 0, 0, 0
  ))
  return date
}