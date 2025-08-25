export interface Review {
  id: string
  product_id: string
  customer_name: string
  customer_location: string
  rating: number
  title: string
  comment: string
  verified_purchase: boolean
  helpful_count: number
  images?: string[]
  created_at: string
}

// Nigerian names and locations for authentic reviews
const reviewerNames = [
  'Adaeze Okonkwo', 'Emeka Nwosu', 'Funke Adeyemi', 'Chidi Okafor',
  'Ngozi Eze', 'Tunde Bakare', 'Aisha Mohammed', 'Kemi Adeleke',
  'Bola Adesanya', 'Chioma Nnamani', 'Yemi Ogunleye', 'Zainab Ibrahim',
  'Segun Adebayo', 'Folake Olowu', 'Uche Igwe', 'Halima Suleiman',
  'Adekunle Fashola', 'Blessing Okoro', 'Ifeanyi Uzoma', 'Fatima Yusuf'
]

const nigerianCities = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Kaduna',
  'Benin City', 'Enugu', 'Owerri', 'Warri', 'Ilorin', 'Jos',
  'Aba', 'Onitsha', 'Uyo', 'Calabar', 'Asaba', 'Abeokuta'
]

const reviewTitles = {
  5: [
    'Excellent quality!',
    'Worth every Naira',
    'Best purchase ever',
    'Highly recommended',
    'Exceeded expectations',
    'Perfect fit and quality',
    'Love it!',
    'Outstanding product'
  ],
  4: [
    'Great product',
    'Very good quality',
    'Happy with purchase',
    'Good value for money',
    'Nice product',
    'Satisfied',
    'Good buy',
    'Pleased with this'
  ],
  3: [
    'Decent product',
    'It\'s okay',
    'Average quality',
    'Fair enough',
    'Not bad',
    'Could be better',
    'Mixed feelings',
    'Acceptable'
  ],
  2: [
    'Not as expected',
    'Disappointed',
    'Poor quality',
    'Below average',
    'Not worth it',
    'Needs improvement',
    'Not satisfied',
    'Regret buying'
  ],
  1: [
    'Very disappointed',
    'Waste of money',
    'Terrible quality',
    'Do not buy',
    'Complete waste',
    'Worst purchase',
    'Avoid this',
    'Never again'
  ]
}

const reviewComments = {
  5: [
    'The quality is absolutely amazing! The fabric feels premium and the stitching is perfect.',
    'I\'ve received so many compliments wearing this. It\'s exactly as described and fits perfectly.',
    'This is genuine quality. You can tell it\'s well-made from the moment you touch it.',
    'Fast delivery to {city} and the product exceeded my expectations. Will definitely order again!',
    'Perfect for Nigerian weather. The material breathes well and looks elegant.',
    'Best online shopping experience! The product is exactly what I wanted.',
    'The attention to detail is impressive. Worth every kobo spent!',
    'Wore this to a wedding and everyone asked where I got it. Absolutely love it!'
  ],
  4: [
    'Good quality product. Minor issues with sizing but overall happy with the purchase.',
    'Nice material and well-made. Delivery took a bit longer than expected to {city}.',
    'The product is good, though slightly different from the pictures. Still satisfied.',
    'Good value for money. The quality is better than most shops in {city}.',
    'Happy with my purchase. The color is slightly different but still looks great.',
    'Fits well and looks good. Would have given 5 stars but packaging could be better.',
    'Quality is good for the price. Recommended for anyone looking for affordable options.',
    'Nice product overall. A few loose threads but nothing major.'
  ],
  3: [
    'Product is okay. Not amazing but not terrible either. Average quality for the price.',
    'It\'s decent. The material is thinner than expected but still wearable.',
    'Mixed feelings about this. Looks good but quality could be better.',
    'Average product. You get what you pay for. Not bad but not great either.',
    'The fit is a bit off but manageable. Material quality is average.',
    'It\'s alright. Expected better based on the description but it\'s acceptable.',
    'Fair product. Some aspects are good, others need improvement.',
    'Not exactly what I expected but it\'s okay. Might order a different style next time.'
  ],
  2: [
    'Disappointed with the quality. Material feels cheap and color faded after first wash.',
    'Not worth the price. I\'ve bought better quality for less in Computer Village.',
    'Product looks nothing like the pictures. Very misleading.',
    'Poor stitching and the size is completely wrong. Had to return it.',
    'Quality is below average. Started showing wear after just a few uses.',
    'Regret this purchase. The material is uncomfortable and looks cheap.',
    'Not satisfied at all. Customer service was unhelpful when I complained.',
    'Save your money. This is not worth it. Very poor quality.'
  ],
  1: [
    'Absolute waste of money! Quality is terrible and it fell apart after one wear.',
    'This is fake! Nothing like what was advertised. Complete scam.',
    'Worst online purchase ever. Material is paper-thin and stitching came undone immediately.',
    'DO NOT BUY! Completely different from description. Waste of time and money.',
    'Terrible experience. Product is counterfeit and customer service ignored my complaints.',
    'I want my money back! This is not what I ordered at all.',
    'Rubbish quality! My local market has better quality than this.',
    'Never ordering from here again. Complete disaster of a purchase.'
  ]
}

function generateReviewDate(): string {
  const daysAgo = Math.floor(Math.random() * 180) // Reviews from last 6 months
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

function generateReview(productId: string, index: number): Review {
  // Generate weighted random rating (more positive reviews)
  const ratingWeights = [1, 2, 3, 4, 5, 5, 4, 5, 4, 3, 5, 4, 5]
  const rating = ratingWeights[Math.floor(Math.random() * ratingWeights.length)]
  
  const reviewer = reviewerNames[Math.floor(Math.random() * reviewerNames.length)]
  const city = nigerianCities[Math.floor(Math.random() * nigerianCities.length)]
  const titles = reviewTitles[rating as keyof typeof reviewTitles]
  const comments = reviewComments[rating as keyof typeof reviewComments]
  
  const title = titles[Math.floor(Math.random() * titles.length)]
  let comment = comments[Math.floor(Math.random() * comments.length)]
  comment = comment.replace('{city}', city)
  
  return {
    id: `review-${productId}-${index}`,
    product_id: productId,
    customer_name: reviewer,
    customer_location: city,
    rating,
    title,
    comment,
    verified_purchase: Math.random() > 0.2, // 80% verified purchases
    helpful_count: Math.floor(Math.random() * 50),
    images: rating >= 4 && Math.random() > 0.7 
      ? [`https://picsum.photos/seed/review-${index}/400/400`]
      : undefined,
    created_at: generateReviewDate()
  }
}

export function generateProductReviews(productId: string, count: number = 10): Review[] {
  const reviews: Review[] = []
  for (let i = 0; i < count; i++) {
    reviews.push(generateReview(productId, i))
  }
  
  // Sort by date (newest first)
  return reviews.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function getAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

export function getRatingDistribution(reviews: Review[]): Record<number, number> {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach(review => {
    distribution[review.rating as keyof typeof distribution]++
  })
  return distribution
}
