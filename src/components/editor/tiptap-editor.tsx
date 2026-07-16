"use client"

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react"
import type { EditorView } from "@tiptap/pm/view"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { getEditorExtensions } from "@/components/editor/extensions"
import { TiptapToolbar } from "@/components/editor/tiptap-toolbar"
import { isUploadableImageFile, uploadTodoImage } from "@/components/editor/upload-image"

const PROSE_CLASSNAME = cn(
  "[&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:first:mt-0",
  "[&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:first:mt-0",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-bold [&_h3]:first:mt-0",
  "[&_p]:my-1.5 [&_p]:first:mt-0 [&_p]:last:mb-0",
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
  "[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md"
)

// 업로드가 끝나기 전까지는 방금 드롭한 파일의 blob: 미리보기를 이미지 노드로 즉시 삽입해 로딩 상태를 보여준다.
// blob URL은 매 파일마다 유일하므로, 업로드 완료 후 문서에서 같은 src를 찾아 실제 공개 URL로 교체(실패 시 제거)한다.
function findImageNodePos(view: EditorView, blobUrl: string): { pos: number; size: number } | null {
  let found: { pos: number; size: number } | null = null

  view.state.doc.descendants((node, pos) => {
    if (found) return false
    if (node.type.name === "image" && node.attrs.src === blobUrl) {
      found = { pos, size: node.nodeSize }
      return false
    }
    return true
  })

  return found
}

function replaceImagePlaceholder(view: EditorView, blobUrl: string, finalSrc: string | null) {
  const target = findImageNodePos(view, blobUrl)
  if (!target) return

  const { state } = view
  const tr = finalSrc
    ? state.tr.setNodeMarkup(target.pos, undefined, { ...state.doc.nodeAt(target.pos)?.attrs, src: finalSrc })
    : state.tr.delete(target.pos, target.pos + target.size)
  view.dispatch(tr)
}

function insertImageAndUpload(view: EditorView, pos: number, file: File, userId: string) {
  const blobUrl = URL.createObjectURL(file)
  const { schema } = view.state
  const imageNode = schema.nodes.image.create({ src: blobUrl })
  view.dispatch(view.state.tr.insert(pos, imageNode))

  uploadTodoImage(file, userId)
    .then((publicUrl) => {
      replaceImagePlaceholder(view, blobUrl, publicUrl)
    })
    .catch(() => {
      toast.error("이미지 업로드에 실패했습니다.")
      replaceImagePlaceholder(view, blobUrl, null)
    })
    .finally(() => {
      URL.revokeObjectURL(blobUrl)
    })
}

export function TiptapEditor({
  content,
  editable = true,
  onChange,
  userId,
  className,
}: {
  content?: JSONContent
  editable?: boolean
  onChange?: (json: JSONContent) => void
  userId?: string
  className?: string
}) {
  const editor = useEditor({
    extensions: getEditorExtensions(),
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "px-3 py-2 text-sm focus:outline-none",
          editable ? "min-h-32" : "min-h-[300px]",
          PROSE_CLASSNAME
        ),
      },
      transformPastedHTML(html) {
        return html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
      },
      handleDrop(view, event) {
        if (!userId || !event.dataTransfer?.files?.length) return false
        const file = event.dataTransfer.files[0]
        if (!isUploadableImageFile(file)) return false

        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (!coordinates) return false

        event.preventDefault()
        insertImageAndUpload(view, coordinates.pos, file, userId)
        return true
      },
      handlePaste(view, event) {
        if (!userId || !event.clipboardData?.files?.length) return false
        const file = event.clipboardData.files[0]
        if (!isUploadableImageFile(file)) return false

        event.preventDefault()
        insertImageAndUpload(view, view.state.selection.from, file, userId)
        return true
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON())
    },
  })

  return (
    <div
      className={cn(
        "rounded-md border border-input",
        editable && "focus-within:ring-3 focus-within:ring-ring/50",
        className
      )}
    >
      {editable && editor && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
