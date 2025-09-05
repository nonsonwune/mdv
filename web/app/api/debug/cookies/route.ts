import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // Get all cookies from the request
  const cookies = req.cookies.getAll()
  
  // Get specific cookies we care about
  const mdvToken = req.cookies.get('mdv_token')
  const mdvRole = req.cookies.get('mdv_role')
  
  return NextResponse.json({
    allCookies: cookies,
    mdvToken: mdvToken ? { name: mdvToken.name, value: mdvToken.value } : null,
    mdvRole: mdvRole ? { name: mdvRole.name, value: mdvRole.value } : null,
    cookieCount: cookies.length,
    timestamp: new Date().toISOString()
  })
}
