"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LogOut, Menu } from "lucide-react"
import { toast } from "sonner"

import { siteConfig } from "@/config/site"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ModeToggle } from "@/components/common/mode-toggle"
import { Container } from "@/components/layout/container"
import { UserNav } from "@/components/auth/user-nav"

function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <nav className={className}>
      {siteConfig.nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}

export function SiteHeader({ displayName }: { displayName: string | null }) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function handleMobileLogout() {
    setMobileMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("로그아웃 되었습니다.")
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {siteConfig.name}
          </Link>

          {/* 데스크톱 네비 (md 이상) */}
          <NavLinks className="hidden md:flex items-center gap-6" />
        </div>

        <div className="hidden md:flex items-center gap-4">
          <ModeToggle />
          {displayName ? (
            <UserNav displayName={displayName} />
          ) : (
            <Button asChild size="sm">
              <Link href="/login">로그인</Link>
            </Button>
          )}
        </div>

        {/* 모바일 네비 (md 미만) */}
        <div className="flex md:hidden items-center gap-2">
          <ModeToggle />
          {displayName && <UserNav displayName={displayName} />}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="메뉴 열기">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{siteConfig.name}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-2">
                <NavLinks
                  className="flex flex-col gap-1"
                  onNavigate={() => setMobileMenuOpen(false)}
                />
                {displayName ? (
                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <p className="truncate px-3 text-sm font-medium">{displayName}</p>
                    <Button variant="outline" className="justify-start" onClick={handleMobileLogout}>
                      <LogOut className="size-4" />
                      로그아웃
                    </Button>
                  </div>
                ) : (
                  <Button asChild onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/login">로그인</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}
