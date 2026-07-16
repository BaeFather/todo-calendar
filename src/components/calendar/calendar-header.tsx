import Link from "next/link"
import { addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatMonthLabel, toMonthParam } from "@/lib/date/calendar"

export function CalendarHeader({ monthDate }: { monthDate: Date }) {
  const prevMonthParam = toMonthParam(subMonths(monthDate, 1))
  const nextMonthParam = toMonthParam(addMonths(monthDate, 1))

  return (
    <div className="flex items-center justify-between py-4">
      <h1 className="text-xl font-semibold">{formatMonthLabel(monthDate)}</h1>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="이전 달">
          <Link href={`/?month=${prevMonthParam}`}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon" aria-label="다음 달">
          <Link href={`/?month=${nextMonthParam}`}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
