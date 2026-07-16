import { StarterKit } from "@tiptap/starter-kit"
import { Placeholder } from "@tiptap/extension-placeholder"
import { Image } from "@tiptap/extension-image"

export function getEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        protocols: ["http", "https", "mailto"],
        openOnClick: false,
      },
    }),
    Placeholder.configure({
      placeholder: "할일 내용을 입력하세요...",
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
    }),
  ]
}
