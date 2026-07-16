import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"
import "./globals.css"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { createClient } from "@/lib/supabase/server"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
}

type Theme = "light" | "dark" | "system"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const savedTheme = (cookieStore.get("theme")?.value ?? "system") as Theme

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let displayName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
    displayName = profile?.display_name ?? null
  }

  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={cn(
        geistSans.variable,
        geistMono.variable,
        "h-full",
        savedTheme === "dark" && "dark"
      )}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider initialTheme={savedTheme}>
          <SiteHeader displayName={user ? (displayName ?? user.email ?? "") : null} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
