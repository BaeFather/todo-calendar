"use client"

import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { isCalendarToday, isCurrentMonth, toDateKey } from "@/lib/date/calendar"
import { TodoPill } from "@/components/calendar/todo-pill"
import type { TodoWithAuthor } from "@/types/todo"

export function CalendarDayList({
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
  const days = weeks.flat().filter((day) => isCurrentMonth(day, monthDate))

  return (
    <div className="flex flex-col gap-2">
      {days.map((day) => {
        const todos = todosByDate.get(toDateKey(day)) ?? []
        const today = isCalendarToday(day)

        return (
          <div
            key={day.toISOString()}
            className="flex flex-col gap-2 rounded-lg border border-border p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-medium",
                    today && "bg-primary text-primary-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
                <span className="text-sm text-muted-foreground">
                  {format(day, "EEEE", { locale: ko })}
                </span>
              </div>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => onSelectDate?.(day)}
                  aria-label="할일 추가"
                  className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {todos.length > 0 ? (
                todos.map((todo) => (
                  <TodoPill key={todo.id} todo={todo} onSelect={onSelectTodo} />
                ))
              ) : (
                <p className="text-xs text-muted-foreground">할일이 없습니다.</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
