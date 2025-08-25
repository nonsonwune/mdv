import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith("/admin")) {
    const role = req.cookies.get("mdv_role")?.value
    if (role !== "staff" && role !== "admin") {
      const url = new URL("/login", req.url)
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ["/admin/:path*"] }

