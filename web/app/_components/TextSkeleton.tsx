export default function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-4 bg-neutral-100 rounded ${i % 3 === 0 ? 'w-5/6' : i % 3 === 1 ? 'w-2/3' : 'w-1/2'}`} />
      ))}
    </div>
  )
}
