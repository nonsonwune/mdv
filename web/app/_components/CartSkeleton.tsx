export default function CartSkeleton() {
  return (
    <div className="mt-6 space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-neutral-200 rounded p-3 flex items-center justify-between">
          <div className="space-y-2 w-1/2">
            <div className="h-4 bg-neutral-100 rounded w-2/3" />
            <div className="h-3 bg-neutral-100 rounded w-1/3" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-neutral-100 rounded" />
            <div className="h-8 w-10 bg-neutral-100 rounded" />
            <div className="h-8 w-8 bg-neutral-100 rounded" />
          </div>
        </div>
      ))}
      <div className="pt-3 flex items-center justify-between">
        <div className="h-9 bg-neutral-100 rounded w-24" />
        <div className="h-4 bg-neutral-100 rounded w-24" />
      </div>
    </div>
  )
}

