// For client-side requests (browser)
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// For server-side requests (Next.js API routes)
// Use internal Railway service URL if available, otherwise fall back to public URL
export const API_BASE_INTERNAL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

