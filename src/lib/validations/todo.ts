import { z } from "zod"
import type { JSONContent } from "@tiptap/react"

// Tiptap 확장 구성(extensions.ts)에서 실제로 등록한 노드/마크만 화이트리스트로 허용한다.
// 저장 직전 서버(Server Action)에서도 동일 스키마로 재검증해 방어선을 이중화한다.
const ALLOWED_NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "hardBreak",
  "image",
])

const ALLOWED_MARK_TYPES = new Set(["bold", "italic", "strike", "link"])

// 이미지는 반드시 우리 Storage 버킷(todo-images)의 공개 URL만 허용한다 — 외부 URL 하이재킹/SSRF성 악용 차단
const TODO_IMAGE_SRC_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/todo-images/`

type TiptapNode = {
  type?: string
  marks?: { type?: string }[]
  content?: TiptapNode[]
  attrs?: { src?: string }
}

function isAllowedNode(node: unknown): node is TiptapNode {
  if (typeof node !== "object" || node === null) return false
  const { type, marks, content, attrs } = node as TiptapNode

  if (typeof type !== "string" || !ALLOWED_NODE_TYPES.has(type)) return false

  if (type === "image") {
    if (typeof attrs?.src !== "string" || !attrs.src.startsWith(TODO_IMAGE_SRC_PREFIX)) {
      return false
    }
  }

  if (marks) {
    for (const mark of marks) {
      if (typeof mark?.type !== "string" || !ALLOWED_MARK_TYPES.has(mark.type)) {
        return false
      }
    }
  }

  if (content) {
    for (const child of content) {
      if (!isAllowedNode(child)) return false
    }
  }

  return true
}

function isEmptyDoc(doc: TiptapNode): boolean {
  const content = doc.content
  if (!Array.isArray(content) || content.length === 0) return true
  if (content.length === 1) {
    const node = content[0]
    if (node?.type === "paragraph" && (!node.content || node.content.length === 0)) {
      return true
    }
  }
  return false
}

export const todoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요.")
    .max(200, "제목은 200자 이하로 입력해주세요."),
  content: z
    .custom<JSONContent>((val) => isAllowedNode(val), "허용되지 않는 서식이 포함되어 있습니다.")
    .refine((val) => !isEmptyDoc(val), "본문을 입력해주세요."),
})

export type TodoFormValues = z.infer<typeof todoSchema>
