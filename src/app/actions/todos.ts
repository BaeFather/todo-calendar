"use server"

import { revalidatePath } from "next/cache"
import type { JSONContent } from "@tiptap/react"

import { createClient } from "@/lib/supabase/server"
import { todoSchema } from "@/lib/validations/todo"

type ActionResult = { success: true } | { success: false; error: string }

const TODO_IMAGE_SRC_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/todo-images/`

// 본문에 실제로 남아있는 이미지 경로만 추출한다 — 이후 고아 이미지 정리 배치(Phase 7 백로그)의 기반 데이터
function extractImagePaths(content: JSONContent): string[] {
  const paths: string[] = []

  function walk(node: JSONContent) {
    const src = node.attrs?.src
    if (node.type === "image" && typeof src === "string" && src.startsWith(TODO_IMAGE_SRC_PREFIX)) {
      paths.push(src.slice(TODO_IMAGE_SRC_PREFIX.length))
    }
    node.content?.forEach(walk)
  }

  walk(content)
  return paths
}

export async function createTodo(input: {
  title: string
  content: JSONContent
  date: string
}): Promise<ActionResult> {
  const parsed = todoSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "로그인이 필요합니다." }
  }

  const { error } = await supabase.from("todos").insert({
    title: parsed.data.title,
    content: parsed.data.content,
    date: input.date,
    image_paths: extractImagePaths(parsed.data.content),
  })
  if (error) return { success: false, error: error.message }

  revalidatePath("/")
  return { success: true }
}

export async function updateTodo(
  todoId: string,
  input: { title: string; content: JSONContent }
): Promise<ActionResult> {
  const parsed = todoSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("todos")
    .update({
      title: parsed.data.title,
      content: parsed.data.content,
      image_paths: extractImagePaths(parsed.data.content),
    })
    .eq("id", todoId)
    .select("id")
  if (error) return { success: false, error: error.message }
  if (!data || data.length === 0) {
    return { success: false, error: "수정 권한이 없습니다." }
  }

  revalidatePath("/")
  return { success: true }
}

export async function deleteTodo(todoId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("todos").delete().eq("id", todoId).select("id")
  if (error) return { success: false, error: error.message }
  if (!data || data.length === 0) {
    return { success: false, error: "삭제 권한이 없습니다." }
  }

  revalidatePath("/")
  return { success: true }
}

export type TodoDetail = {
  id: string
  title: string
  content: JSONContent
  date: string
  user_id: string
  display_name: string
}

export async function getTodoById(todoId: string): Promise<TodoDetail | null> {
  const supabase = await createClient()
  const { data: todo, error } = await supabase
    .from("todos")
    .select("id, title, content, date, user_id")
    .eq("id", todoId)
    .single()
  if (error || !todo) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", todo.user_id)
    .single()

  return {
    ...todo,
    content: todo.content as JSONContent,
    display_name: profile?.display_name ?? "알 수 없음",
  }
}
