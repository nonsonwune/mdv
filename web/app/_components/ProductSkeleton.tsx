export default function ProductSkeleton() {
  return (
    <div className="border border-neutral-200 rounded p-4 animate-pulse">
      <div className="aspect-square bg-neutral-100 mb-2" />
      <div className="h-4 bg-neutral-100 rounded w-3/4" />
      <div className="h-4 bg-neutral-100 rounded w-1/2 mt-2" />
      <div className="mt-3 flex items-center gap-2">
        <div className="h-8 bg-neutral-100 rounded w-20" />
        <div className="h-8 bg-neutral-100 rounded w-16" />
      </div>
    </div>
  )
}
