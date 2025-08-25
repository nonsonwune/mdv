export async function GET() {
  return Response.json({ status: "ok", service: "mdv-web", timestamp: new Date().toISOString() })
}

