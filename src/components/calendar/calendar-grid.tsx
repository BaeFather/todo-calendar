"use client"

import { WEEKDAY_LABELS, toDateKey } from "@/lib/date/calendar"
import { CalendarCell } from "@/components/calendar/calendar-cell"
import type { TodoWithAuthor } from "@/types/todo"

export function CalendarGrid({
  monthDate,
  weeks,
  todosByDate,
  canCreate,
  onSelectDate,
  onSelectTodo,
}: {
  monthDate: Date
  weeks: Date[][]
  todosByDate: Map<string, TodoWithAuthor[]>
  canCreate: boolean
  onSelectDate?: (day: Date) => void
  onSelectTodo?: (todoId: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border-t border-l border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flatMap((week) =>
          week.map((day) => (
            <CalendarCell
              key={day.toISOString()}
              day={day}
              monthDate={monthDate}
              todos={todosByDate.get(toDateKey(day)) ?? []}
              canCreate={canCreate}
              onSelectDate={onSelectDate}
              onSelectTodo={onSelectTodo}
            />
          ))
        )}
      </div>
    </div>
  )
}
