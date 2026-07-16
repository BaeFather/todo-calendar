"use client"

import type { TodoWithAuthor } from "@/types/todo"

export function TodoPill({
  todo,
  onSelect,
}: {
  todo: TodoWithAuthor
  onSelect?: (todoId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(todo.id)}
      title={`${todo.title} · ${todo.display_name}`}
      className="w-full truncate rounded-md bg-foreground/10 px-1.5 py-0.5 text-left text-xs text-foreground transition-colors hover:bg-foreground/20"
    >
      {todo.title}
    </button>
  )
}
