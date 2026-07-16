import { createClient } from "@/lib/supabase/server"
import { Container } from "@/components/layout/container"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { CalendarPage } from "@/components/calendar/calendar-page"
import { getCalendarMonthMatrix, parseMonthParam, toDateKey } from "@/lib/date/calendar"
import type { TodoWithAuthor } from "@/types/todo"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const monthDate = parseMonthParam(month)
  const weeks = getCalendarMonthMatrix(monthDate)
  const gridStart = toDateKey(weeks[0][0])
  const gridEnd = toDateKey(weeks[weeks.length - 1][6])

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: todos } = await supabase
    .from("todos")
    .select("id, title, date, user_id")
    .gte("date", gridStart)
    .lte("date", gridEnd)
    .order("created_at", { ascending: true })

  const userIds = [...new Set((todos ?? []).map((todo) => todo.user_id))]
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] }

  const displayNameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))

  const todosByDate = new Map<string, TodoWithAuthor[]>()
  for (const todo of todos ?? []) {
    const withAuthor: TodoWithAuthor = {
      ...todo,
      display_name: displayNameById.get(todo.user_id) ?? "알 수 없음",
    }
    const list = todosByDate.get(todo.date) ?? []
    list.push(withAuthor)
    todosByDate.set(todo.date, list)
  }

  return (
    <Container className="py-4">
      <CalendarHeader monthDate={monthDate} />
      <CalendarPage
        monthDate={monthDate}
        weeks={weeks}
        todosByDate={todosByDate}
        canCreate={!!user}
        currentUserId={user?.id ?? null}
      />
    </Container>
  )
}
