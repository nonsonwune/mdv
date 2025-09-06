import { redirect } from 'next/navigation'

export default function ProductsPage() {
  // Redirect to the main catalog on the homepage
  redirect('/#catalog')
}
