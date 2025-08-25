export default function CheckoutSteps({ current }: { current: 1 | 2 }) {
  const steps = ["Shipping details", "Review & Pay"]
  return (
    <ol className="flex items-center gap-4 text-sm" aria-label="Checkout steps">
      {steps.map((label, i) => {
        const stepNum = (i + 1) as 1 | 2
        const active = stepNum === current
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs ${active ? 'bg-[var(--maroon-700)]' : 'bg-neutral-400'}`}>{stepNum}</span>
            <span className={active ? 'font-medium' : 'text-neutral-500'}>{label}</span>
            {i < steps.length - 1 ? <span className="mx-2 text-neutral-400">›</span> : null}
          </li>
        )
      })}
    </ol>
  )
}

