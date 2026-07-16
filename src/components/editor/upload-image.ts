import { createClient } from "@/lib/supabase/client"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

export function isUploadableImageFile(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE
}

export async function uploadTodoImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png"
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const supabase = createClient()
  const { error } = await supabase.storage.from("todo-images").upload(path, file, {
    contentType: file.type,
  })
  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from("todo-images").getPublicUrl(path)

  return publicUrl
}
