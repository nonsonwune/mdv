import Link from "next/link"

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 text-sm">
        <Link href="/" className="underline">← Home</Link>
      </div>
      {children}
    </div>
  )
}

