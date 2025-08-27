import "./globals.css"
import type { Metadata, Viewport } from "next"
import Link from "next/link"
import { cookies } from "next/headers"
import HeaderCart from "./_components/HeaderCart"
import SearchBar from "./_components/SearchBar"
import MobileNav from "../components/navigation/MobileNav"
import HeaderCartCount from "./_components/HeaderCartCount"
import ToastProvider from "./_components/ToastProvider"
import { AuthProvider } from "../lib/auth-context"
import NavigationAuth from "./_components/NavigationAuth"
import ConditionalNavigation from "./_components/ConditionalNavigation"
import ConditionalFooter from "./_components/ConditionalFooter"

export const metadata: Metadata = {
  title: "Maison De Valeur",
  description: "Affordable essentials and last-season fashion.",
  metadataBase: new URL('https://mdv.ng'),
  openGraph: {
    title: "Maison De Valeur",
    description: "Affordable essentials and last-season fashion.",
    type: "website",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#800000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const role = cookies().get("mdv_role")?.value
  const isStaff = role && ["admin", "supervisor", "operations", "logistics"].includes(role)
  
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-maroon-700 text-white px-4 py-2 rounded">
            Skip to main content
          </a>
          
          {/* Conditional Customer Navigation - only shows on non-admin pages */}
          <ConditionalNavigation />
          
          <main id="main-content" className="min-h-[70vh]">
            {children}
          </main>
          
          {/* Conditional Customer Footer - only shows on non-admin pages */}
          <ConditionalFooter />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

