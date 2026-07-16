export const siteConfig = {
  name: "todo-calendar",
  description: "캘린더 기반 할일(Todo) 웹서비스",
  url: "https://example.com",
  nav: [{ title: "홈", href: "/" }],
  links: {
    github: "https://github.com",
  },
} as const

export type SiteConfig = typeof siteConfig
