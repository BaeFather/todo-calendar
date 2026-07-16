import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ko } from "date-fns/locale"

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const

export function getCalendarMonthMatrix(monthDate: Date): Date[][] {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

export function isCurrentMonth(day: Date, monthDate: Date): boolean {
  return isSameMonth(day, monthDate)
}

export function isCalendarToday(day: Date): boolean {
  return isToday(day)
}

export function toDateKey(day: Date): string {
  return format(day, "yyyy-MM-dd")
}

export function formatMonthLabel(monthDate: Date): string {
  return format(monthDate, "yyyy년 M월", { locale: ko })
}

export function parseMonthParam(month: string | undefined): Date {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthIndex] = month.split("-").map(Number)
    return new Date(year, monthIndex - 1, 1)
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export function toMonthParam(monthDate: Date): string {
  return format(monthDate, "yyyy-MM")
}
