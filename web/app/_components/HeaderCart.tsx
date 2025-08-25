"use client"

import Link from "next/link"
import HeaderCartCount from "./HeaderCartCount"

import { useState, useCallback } from "react"
import MiniCart from "./MiniCart"

export default function HeaderCart() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <div className="relative flex items-center gap-1">
      <button className="hover:underline" onClick={() => setOpen((v) => !v)}>Cart</button>
      <HeaderCartCount />
      {open ? <MiniCart onClose={close} /> : null}
    </div>
  )
}

