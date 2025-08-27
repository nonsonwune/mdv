"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "../../lib/auth-context"

export default function ConditionalFooter() {
  const pathname = usePathname()
  const { isStaff } = useAuth()
  
  // Check if we're on an admin page
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/staff-login')
  
  // Show customer footer if:
  // - Not on admin page, OR
  // - On admin page but user is viewing as customer (when they access /account, etc.)
  const showCustomerFooter = !isAdminPage || (isStaff && pathname.startsWith('/account'))
  
  // If we shouldn't show customer footer, return null
  if (!showCustomerFooter) {
    return null
  }
  
  return (
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
  )
}
