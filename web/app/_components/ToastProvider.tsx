"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

export type ToastVariant = "success" | "error" | "info"

type ToastItem = {
  id: string
  title?: string
  description?: string
  variant: ToastVariant
}

type ToastContextValue = {
  add: (t: Omit<ToastItem, "id">) => void
  success: (msg: string, description?: string) => void
  error: (msg: string, description?: string) => void
  info: (msg: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const color = item.variant === "success" ? "bg-[var(--success)]" : item.variant === "error" ? "bg-[var(--danger)]" : "bg-[var(--ink-700)]"
  return (
    <div className={`text-white rounded shadow-md p-3 min-w-[240px] ${color}`} role="status" aria-live="polite">
      {item.title ? <div className="font-medium">{item.title}</div> : null}
      {item.description ? <div className="text-sm opacity-90 mt-0.5">{item.description}</div> : null}
      <button className="mt-2 text-xs underline" onClick={onClose}>Dismiss</button>
    </div>
  )
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const add = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2)
    const item: ToastItem = { id, ...t }
    setToasts((prev) => [...prev, item])
    // auto-dismiss after 4s
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000)
  }, [])

  const api = useMemo<ToastContextValue>(() => ({
    add,
    success: (msg, description) => add({ title: msg, description, variant: "success" }),
    error: (msg, description) => add({ title: msg, description, variant: "error" }),
    info: (msg, description) => add({ title: msg, description, variant: "info" }),
  }), [add])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

