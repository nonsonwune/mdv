export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-neutral-100 rounded w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-neutral-200 rounded p-4">
              <div className="aspect-square bg-neutral-100 mb-2" />
              <div className="h-4 bg-neutral-100 rounded w-3/4" />
              <div className="h-4 bg-neutral-100 rounded w-1/2 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

