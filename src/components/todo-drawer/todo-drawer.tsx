"use client"

import { useEffect, useState } from "react"

import { getTodoById, type TodoDetail } from "@/app/actions/todos"
import { TodoForm } from "@/components/todo-drawer/todo-form"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export type DrawerState = { mode: "create"; date: Date } | { mode: "edit"; todoId: string } | null

export function TodoDrawer({
  state,
  onOpenChange,
  currentUserId,
}: {
  state: DrawerState
  onOpenChange: (open: boolean) => void
  currentUserId: string | null
}) {
  const [result, setResult] = useState<{ todoId: string; data: TodoDetail | null } | null>(null)

  useEffect(() => {
    if (state?.mode !== "edit") return

    let cancelled = false
    getTodoById(state.todoId).then((data) => {
      if (!cancelled) setResult({ todoId: state.todoId, data })
    })

    return () => {
      cancelled = true
    }
  }, [state])

  const activeTodoId = state?.mode === "edit" ? state.todoId : null
  const loading = activeTodoId !== null && result?.todoId !== activeTodoId
  const todo = activeTodoId !== null && result?.todoId === activeTodoId ? result.data : null

  return (
    <Sheet open={state !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{state?.mode === "create" ? "할일 추가" : "할일 상세"}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          {state?.mode === "create" && (
            <TodoForm
              mode="create"
              date={state.date}
              currentUserId={currentUserId}
              onSuccess={() => onOpenChange(false)}
            />
          )}
          {state?.mode === "edit" && loading && (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          )}
          {state?.mode === "edit" && !loading && !todo && (
            <p className="text-sm text-muted-foreground">할일을 찾을 수 없습니다.</p>
          )}
          {state?.mode === "edit" && !loading && todo && (
            <TodoForm
              mode="edit"
              todoId={todo.id}
              date={todo.date}
              defaultTitle={todo.title}
              defaultContent={todo.content}
              isOwner={currentUserId === todo.user_id}
              authorName={todo.display_name}
              currentUserId={currentUserId}
              onSuccess={() => onOpenChange(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
