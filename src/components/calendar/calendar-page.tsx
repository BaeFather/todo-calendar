"use client"

import { useState } from "react"

import { CalendarGrid } from "@/components/calendar/calendar-grid"
import { CalendarDayList } from "@/components/calendar/calendar-day-list"
import { TodoDrawer, type DrawerState } from "@/components/todo-drawer/todo-drawer"
import type { TodoWithAuthor } from "@/types/todo"

export function CalendarPage({
  monthDate,
  weeks,
  todosByDate,
  canCreate,
  currentUserId,
}: {
  monthDate: Date
  weeks: Date[][]
  todosByDate: Map<string, TodoWithAuthor[]>
  canCreate: boolean
  currentUserId: string | null
}) {
  const [drawerState, setDrawerState] = useState<DrawerState>(null)

  return (
    <>
      <div className="hidden md:block">
        <CalendarGrid
          monthDate={monthDate}
          weeks={weeks}
          todosByDate={todosByDate}
          canCreate={canCreate}
          onSelectDate={(date) => setDrawerState({ mode: "create", date })}
          onSelectTodo={(todoId) => setDrawerState({ mode: "edit", todoId })}
        />
      </div>
      <div className="md:hidden">
        <CalendarDayList
          monthDate={monthDate}
          weeks={weeks}
          todosByDate={todosByDate}
          canCreate={canCreate}
          onSelectDate={(date) => setDrawerState({ mode: "create", date })}
          onSelectTodo={(todoId) => setDrawerState({ mode: "edit", todoId })}
        />
      </div>
      <TodoDrawer
        state={drawerState}
        onOpenChange={(open) => !open && setDrawerState(null)}
        currentUserId={currentUserId}
      />
    </>
  )
}
