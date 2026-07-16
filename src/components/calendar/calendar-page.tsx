"use client"

import { useState } from "react"

import { CalendarGrid } from "@/components/calendar/calendar-grid"
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
      <CalendarGrid
        monthDate={monthDate}
        weeks={weeks}
        todosByDate={todosByDate}
        canCreate={canCreate}
        onSelectDate={(date) => setDrawerState({ mode: "create", date })}
        onSelectTodo={(todoId) => setDrawerState({ mode: "edit", todoId })}
      />
      <TodoDrawer
        state={drawerState}
        onOpenChange={(open) => !open && setDrawerState(null)}
        currentUserId={currentUserId}
      />
    </>
  )
}
