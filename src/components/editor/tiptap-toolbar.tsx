"use client"

import type { Editor } from "@tiptap/react"
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function ToolbarButton({
  isActive,
  ...props
}: React.ComponentProps<typeof Button> & { isActive?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(isActive && "bg-muted text-foreground")}
      {...props}
    />
  )
}

export function TiptapToolbar({ editor }: { editor: Editor }) {
  function handleSetLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("링크 URL을 입력하세요", previousUrl ?? "https://")

    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
      <ToolbarButton
        aria-label="굵게"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        aria-label="기울임"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      {[1, 2, 3].map((level) => (
        <ToolbarButton
          key={level}
          aria-label={`제목 ${level}`}
          isActive={editor.isActive("heading", { level })}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 1 | 2 | 3 })
              .run()
          }
        >
          <span className="text-xs font-semibold">H{level}</span>
        </ToolbarButton>
      ))}
      <ToolbarButton
        aria-label="글머리 기호 목록"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        aria-label="번호 매기기 목록"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        aria-label="링크"
        isActive={editor.isActive("link")}
        onClick={handleSetLink}
      >
        <Link2 />
      </ToolbarButton>
    </div>
  )
}
