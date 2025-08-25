import Link from "next/link"

export default function AdminHome() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>Admin Dashboard</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-600)" }}>
        This area is RBAC-protected. You should only see this if you are signed in as staff.
      </p>
      <div className="mt-6">
        <Link href="/admin/orders" className="btn-primary">View Orders</Link>
      </div>
    </div>
  )
}

