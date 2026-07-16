// 공공데이터포털 "한국천문연구원_특일 정보" 서비스의 공휴일 정보조회(getRestDeInfo) 오퍼레이션.
// 발급받은 서비스키가 이 오퍼레이션만 사용하도록 설정되어 있어, 공휴일(대체공휴일·임시공휴일 포함) 조회 용도로만 사용한다.
const HOLIDAY_API_URL =
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"

type HolidayApiItem = {
  locdate: number
  dateName: string
  isHoliday: string
}

type HolidayApiResponse = {
  response?: {
    header?: { resultCode?: string }
    body?: {
      items?: { item?: HolidayApiItem | HolidayApiItem[] } | ""
    }
  }
}

function toDateKey(locdate: number): string {
  const raw = String(locdate)
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

async function getHolidayDatesForYear(year: number): Promise<string[]> {
  const serviceKey = process.env.HOLIDAY_API_SERVICE_KEY
  if (!serviceKey) return []

  const url = new URL(HOLIDAY_API_URL)
  url.searchParams.set("solYear", String(year))
  url.searchParams.set("ServiceKey", serviceKey)
  url.searchParams.set("numOfRows", "100")
  url.searchParams.set("_type", "json")

  try {
    // 임시공휴일은 발표 후 1일 이내 갱신되므로 하루 단위로 재검증한다.
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })
    if (!res.ok) return []

    const data = (await res.json()) as HolidayApiResponse
    const items = data.response?.body?.items
    if (!items || !items.item) return []

    const list = Array.isArray(items.item) ? items.item : [items.item]
    return list.map((item) => toDateKey(item.locdate))
  } catch {
    return []
  }
}

export async function getHolidayDateSet(years: number[]): Promise<Set<string>> {
  const uniqueYears = [...new Set(years)]
  const results = await Promise.all(uniqueYears.map(getHolidayDatesForYear))
  return new Set(results.flat())
}
