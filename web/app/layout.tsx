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
          <header className="border-b border-neutral-200 sticky top-0 bg-white/95 backdrop-blur z-40">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                {/* Logo and Mobile Menu */}
                <div className="flex items-center gap-4">
                  <MobileNav />
                  <Link href="/" className="text-xl font-semibold" style={{color: "var(--maroon-700)"}}>
                    MDV
                  </Link>
                </div>
                
                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6 text-sm">
                  <Link href="/men" className="hover:text-maroon-700 transition-colors">Men</Link>
                  <Link href="/women" className="hover:text-maroon-700 transition-colors">Women</Link>
                  <Link href="/essentials" className="hover:text-maroon-700 transition-colors">Essentials</Link>
                  <Link href="/sale" className="font-medium" style={{color: "var(--maroon-700)"}}>Sale</Link>
                  <Link href="/about" className="hover:text-maroon-700 transition-colors">About</Link>
                </nav>
                
                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                  <SearchBar />
                  <HeaderCart />
                  {/* Desktop only account links */}
                  <NavigationAuth />
                </div>
              </div>
            </div>
          </header>
          
          <main id="main-content" className="min-h-[70vh]">
            {children}
          </main>
          
          <footer className="bg-neutral-50 border-t border-neutral-200 mt-16">
            <div className="container mx-auto px-4 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand Column */}
                <div>
                  <h3 className="font-semibold mb-4" style={{color: "var(--maroon-700)"}}>Maison De Valeur</h3>
                  <p className="text-sm text-neutral-600">
                    Affordable essentials and last-season fashion for Nigeria.
                  </p>
                </div>
                
                {/* Shop Column */}
                <div>
                  <h4 className="font-medium mb-4">Shop</h4>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/men" className="text-neutral-600 hover:text-maroon-700">Men</Link></li>
                    <li><Link href="/women" className="text-neutral-600 hover:text-maroon-700">Women</Link></li>
                    <li><Link href="/essentials" className="text-neutral-600 hover:text-maroon-700">Essentials</Link></li>
                    <li><Link href="/sale" className="text-neutral-600 hover:text-maroon-700">Sale</Link></li>
                  </ul>
                </div>
                
                {/* Help Column */}
                <div>
                  <h4 className="font-medium mb-4">Help</h4>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/contact" className="text-neutral-600 hover:text-maroon-700">Contact Us</Link></li>
                    <li><Link href="/shipping" className="text-neutral-600 hover:text-maroon-700">Shipping & Returns</Link></li>
                    <li><Link href="/size-guide" className="text-neutral-600 hover:text-maroon-700">Size Guide</Link></li>
                    <li><Link href="/faq" className="text-neutral-600 hover:text-maroon-700">FAQ</Link></li>
                  </ul>
                </div>
                
                {/* Contact Column */}
                <div>
                  <h4 className="font-medium mb-4">Contact</h4>
                  <div className="space-y-2 text-sm text-neutral-600">
                    <p>WhatsApp Support:</p>
                    <a 
                      href="https://wa.me/+2348136514087" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-maroon-700 hover:text-maroon-800"
                    >
                      +234 813 651 4087
                    </a>
                    <p className="pt-2">Monday - Saturday<br />9:00 AM - 6:00 PM WAT</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-neutral-200 mt-8 pt-8 text-center text-sm text-neutral-600">
                <p>&copy; 2024 Maison De Valeur. All rights reserved.</p>
                <div className="mt-2 space-x-4">
                  <Link href="/terms" className="hover:text-maroon-700">Terms of Service</Link>
                  <Link href="/privacy" className="hover:text-maroon-700">Privacy Policy</Link>
                </div>
              </div>
            </div>
          </footer>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

