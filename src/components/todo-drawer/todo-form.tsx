"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { JSONContent } from "@tiptap/react"

import { todoSchema, type TodoFormValues } from "@/lib/validations/todo"
import { createTodo, updateTodo } from "@/app/actions/todos"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { DeleteTodoButton } from "@/components/todo-drawer/delete-todo-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const emptyContent: JSONContent = { type: "doc", content: [{ type: "paragraph" }] }

type TodoFormProps =
  | {
      mode: "create"
      date: Date
      currentUserId: string | null
      onSuccess: () => void
    }
  | {
      mode: "edit"
      todoId: string
      date: string
      defaultTitle: string
      defaultContent: JSONContent
      isOwner: boolean
      authorName: string
      currentUserId: string | null
      onSuccess: () => void
    }

export function TodoForm(props: TodoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: props.mode === "edit" ? props.defaultTitle : "",
      content: props.mode === "edit" ? props.defaultContent : emptyContent,
    },
    mode: "onTouched",
  })

  const readOnly = props.mode === "edit" && !props.isOwner
  const displayDate = format(
    props.mode === "create" ? props.date : new Date(props.date),
    "yyyy년 M월 d일",
    { locale: ko }
  )

  function onSubmit(values: TodoFormValues) {
    startTransition(async () => {
      // Tiptap 노드의 attrs는 ProseMirror 내부 객체를 참조로 재사용하므로, Server Action 경계를
      // 넘기기 전에 JSON 왕복으로 완전히 새로운 순수 객체 그래프를 만들어 전달한다.
      const plainContent = JSON.parse(JSON.stringify(values.content))
      const result =
        props.mode === "create"
          ? await createTodo({
              title: values.title,
              content: plainContent,
              date: format(props.date, "yyyy-MM-dd"),
            })
          : await updateTodo(props.todoId, { title: values.title, content: plainContent })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(props.mode === "create" ? "할일을 등록했습니다." : "할일을 수정했습니다.")
      router.refresh()
      props.onSuccess()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {displayDate}
          {props.mode === "edit" && ` · ${props.authorName}`}
        </p>

        {readOnly ? (
          <>
            <h2 className="text-lg font-semibold">{props.defaultTitle}</h2>
            <TiptapEditor content={props.defaultContent} editable={false} />
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목</FormLabel>
                  <FormControl>
                    <Input placeholder="할일 제목" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>내용</FormLabel>
                  <TiptapEditor
                    content={field.value}
                    onChange={field.onChange}
                    userId={props.currentUserId ?? undefined}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-between gap-2">
              {props.mode === "edit" ? (
                <DeleteTodoButton todoId={props.todoId} onDeleted={props.onSuccess} />
              ) : (
                <span />
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Form>
  )
}
