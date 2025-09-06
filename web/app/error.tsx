"use client"

import Image from "next/image"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mb-8">
            <Image
              src="/images/mdv-logo-rlogomark-btext-nobg.png"
              alt="MDV - Maison De Valeur"
              width={120}
              height={40}
              className="h-10 w-auto mx-auto"
            />
          </div>
          <h2 className="text-2xl font-semibold" style={{ color: "var(--ink-700)" }}>Something went wrong</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-600)" }}>{error.message || "Unexpected error"}</p>
          <button className="btn-primary mt-6" onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}

