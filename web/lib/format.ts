export function formatNaira(value: number | string): string {
  const n = Number(value || 0)
  return `₦${n.toLocaleString()}`
}

