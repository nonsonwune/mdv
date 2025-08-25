"use client"

import { useState } from 'react'
import { Card, Button, Input, Badge } from '../ui'

export type PaymentMethod = {
  id: string
  type: 'card' | 'bank_transfer' | 'paystack' | 'flutterwave'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  bankName?: string
  accountName?: string
  isDefault?: boolean
}

interface PaymentMethodsProps {
  onSelectMethod: (method: PaymentMethod) => void
  selectedMethodId?: string
}

export default function PaymentMethods({ onSelectMethod, selectedMethodId }: PaymentMethodsProps) {
  const [paymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true
    },
    {
      id: '2',
      type: 'card',
      last4: '5555',
      brand: 'Mastercard',
      expiryMonth: 8,
      expiryYear: 2024
    }
  ])
  
  const [showNewCard, setShowNewCard] = useState(false)
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    saveCard: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const paymentOptions = [
    {
      id: 'new_card',
      type: 'card' as const,
      title: 'Credit/Debit Card',
      description: 'Pay securely with your card',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer' as const,
      title: 'Bank Transfer',
      description: 'Transfer directly to our bank account',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'paystack',
      type: 'paystack' as const,
      title: 'Paystack',
      description: 'Pay with Paystack gateway',
      icon: (
        <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
          P
        </div>
      )
    },
    {
      id: 'flutterwave',
      type: 'flutterwave' as const,
      title: 'Flutterwave',
      description: 'Pay with Flutterwave (Rave)',
      icon: (
        <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">
          F
        </div>
      )
    }
  ]

  const validateCard = () => {
    const newErrors: Record<string, string> = {}
    
    // Card number validation
    const cardNumber = cardData.number.replace(/\s/g, '')
    if (!cardNumber) {
      newErrors.number = 'Card number is required'
    } else if (cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.number = 'Invalid card number'
    }
    
    // Name validation
    if (!cardData.name) {
      newErrors.name = 'Cardholder name is required'
    }
    
    // Expiry validation
    if (!cardData.expiry) {
      newErrors.expiry = 'Expiry date is required'
    } else {
      const [month, year] = cardData.expiry.split('/')
      const currentYear = new Date().getFullYear() % 100
      const currentMonth = new Date().getMonth() + 1
      
      if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
        newErrors.expiry = 'Invalid expiry date'
      } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiry = 'Card has expired'
      }
    }
    
    // CVV validation
    if (!cardData.cvv) {
      newErrors.cvv = 'CVV is required'
    } else if (cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      newErrors.cvv = 'Invalid CVV'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCardSubmit = () => {
    if (!validateCard()) return
    
    // Create new payment method
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: 'card',
      last4: cardData.number.slice(-4),
      brand: detectCardBrand(cardData.number),
      expiryMonth: parseInt(cardData.expiry.split('/')[0]),
      expiryYear: 2000 + parseInt(cardData.expiry.split('/')[1])
    }
    
    onSelectMethod(newMethod)
    setShowNewCard(false)
    setCardData({ number: '', name: '', expiry: '', cvv: '', saveCard: false })
    setErrors({})
  }

  const detectCardBrand = (number: string): string => {
    const firstDigit = number[0]
    if (firstDigit === '4') return 'Visa'
    if (firstDigit === '5') return 'Mastercard'
    if (firstDigit === '3') return 'Amex'
    return 'Card'
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    
    if (parts.length) {
      return parts.join(' ')
    } else {
      return value
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '')
    }
    return v
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Payment Method</h3>

      {/* Saved Cards */}
      {paymentMethods.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-600">Saved Cards</p>
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedMethodId === method.id
                  ? 'ring-2 ring-maroon-700 bg-maroon-50'
                  : 'hover:shadow-md'
              }`}
              onClick={() => onSelectMethod(method)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-neutral-100 rounded flex items-center justify-center text-xs font-medium">
                    {method.brand}
                  </div>
                  <div>
                    <p className="font-medium">•••• {method.last4}</p>
                    <p className="text-xs text-neutral-600">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  </div>
                </div>
                {method.isDefault && (
                  <Badge variant="primary" size="sm">Default</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Options */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-neutral-600">Other Payment Methods</p>
        {paymentOptions.map((option) => (
          <Card
            key={option.id}
            className={`p-4 cursor-pointer transition-all ${
              (option.id === 'new_card' && showNewCard) || selectedMethodId === option.id
                ? 'ring-2 ring-maroon-700 bg-maroon-50'
                : 'hover:shadow-md'
            }`}
            onClick={() => {
              if (option.type === 'card') {
                setShowNewCard(true)
              } else {
                onSelectMethod(option as PaymentMethod)
              }
            }}
          >
            <div className="flex items-center gap-3">
              {option.icon}
              <div className="flex-1">
                <p className="font-medium">{option.title}</p>
                <p className="text-xs text-neutral-600">{option.description}</p>
              </div>
            </div>

            {/* New Card Form */}
            {option.id === 'new_card' && showNewCard && (
              <div className="mt-4 pt-4 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
                <Input
                  label="Card Number"
                  value={cardData.number}
                  onChange={(e) => setCardData({ 
                    ...cardData, 
                    number: formatCardNumber(e.target.value)
                  })}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  error={errors.number}
                />
                
                <Input
                  label="Cardholder Name"
                  value={cardData.name}
                  onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                  placeholder="John Doe"
                  error={errors.name}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Expiry Date"
                    value={cardData.expiry}
                    onChange={(e) => setCardData({ 
                      ...cardData, 
                      expiry: formatExpiry(e.target.value)
                    })}
                    placeholder="MM/YY"
                    maxLength={5}
                    error={errors.expiry}
                  />
                  
                  <Input
                    label="CVV"
                    type="password"
                    value={cardData.cvv}
                    onChange={(e) => setCardData({ 
                      ...cardData, 
                      cvv: e.target.value.replace(/\D/g, '')
                    })}
                    placeholder="123"
                    maxLength={4}
                    error={errors.cvv}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveCard"
                    checked={cardData.saveCard}
                    onChange={(e) => setCardData({ ...cardData, saveCard: e.target.checked })}
                    className="rounded border-neutral-300 text-maroon-700 focus:ring-maroon-700"
                  />
                  <label htmlFor="saveCard" className="text-sm">
                    Save card for future purchases
                  </label>
                </div>
                
                <Button
                  variant="primary"
                  onClick={handleCardSubmit}
                  className="w-full"
                >
                  Use This Card
                </Button>
              </div>
            )}

            {/* Bank Transfer Details */}
            {option.id === 'bank_transfer' && selectedMethodId === option.id && (
              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <p className="font-medium">Bank Transfer Details:</p>
                <div className="bg-neutral-50 p-3 rounded space-y-1">
                  <p><span className="font-medium">Bank:</span> First Bank Nigeria</p>
                  <p><span className="font-medium">Account Name:</span> MDV Fashion Store</p>
                  <p><span className="font-medium">Account Number:</span> 3087654321</p>
                  <p><span className="font-medium">Reference:</span> ORD-{Date.now()}</p>
                </div>
                <p className="text-xs text-amber-600">
                  Please use the reference number when making the transfer
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-green-800">Your payment is secure</p>
            <p className="text-green-700">We use SSL encryption to protect your information</p>
          </div>
        </div>
      </div>
    </div>
  )
}
