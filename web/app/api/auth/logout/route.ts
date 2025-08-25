import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  const prod = process.env.NODE_ENV === "production"
  res.cookies.set("mdv_token", "", { httpOnly: true, secure: prod, sameSite: "lax", path: "/", expires: new Date(0) })
  res.cookies.set("mdv_role", "", { httpOnly: true, secure: prod, sameSite: "lax", path: "/", expires: new Date(0) })
  return res
}

