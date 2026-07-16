"use client"

import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { isCalendarToday, isCurrentMonth, toDateKey } from "@/lib/date/calendar"
import { TodoPill } from "@/components/calendar/todo-pill"
import type { TodoWithAuthor } from "@/types/todo"

export function CalendarCell({
  day,
  monthDate,
  todos,
  holidays,
  canCreate,
  onSelectDate,
  onSelectTodo,
}: {
  day: Date
  monthDate: Date
  todos: TodoWithAuthor[]
  holidays: Set<string>
  canCreate: boolean
  onSelectDate?: (day: Date) => void
  onSelectTodo?: (todoId: string) => void
}) {
  const inCurrentMonth = isCurrentMonth(day, monthDate)
  const today = isCalendarToday(day)
  const isWeekendOrHoliday = day.getDay() === 0 || day.getDay() === 6 || holidays.has(toDateKey(day))

  return (
    <div
      className={cn(
        "group flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5",
        !inCurrentMonth && "bg-muted/30 text-muted-foreground"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-medium",
            !today && isWeekendOrHoliday && "text-[#FF2222]",
            today && "bg-primary text-primary-foreground"
          )}
        >
          {day.getDate()}
        </span>
        {canCreate && (
          <button
            type="button"
            onClick={() => onSelectDate?.(day)}
            aria-label="할일 추가"
            className="invisible flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent group-hover:visible"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {todos.map((todo) => (
          <TodoPill key={todo.id} todo={todo} onSelect={onSelectTodo} />
        ))}
      </div>
    </div>
  )
}
