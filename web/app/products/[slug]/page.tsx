import { redirect } from 'next/navigation'

export default function ProductSlugRedirect({ params }: { params: { slug: string } }) {
  // Redirect from /products/[slug] to /product/[slug] for consistency
  redirect(`/product/${params.slug}`)
}
