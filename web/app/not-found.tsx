import Image from "next/image"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <div className="mb-8">
        <Image
          src="/images/mdv-logo-rlogomark-btext-nobg.png"
          alt="MDV - Maison De Valeur"
          width={120}
          height={40}
          className="h-10 w-auto mx-auto"
        />
      </div>
      <h1 className="text-3xl font-semibold" style={{ color: "var(--ink-700)" }}>Page not found</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-600)" }}>The page you are looking for doesn’t exist or has been moved.</p>
      <a href="/" className="btn-primary mt-6 inline-block">Go back home</a>
    </div>
  )
}

