"use client"

import Image from "next/image"
import Link from "next/link"
import { Button, Card } from "../../components/ui"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--maroon-700)" }}>
            About Maison De Valeur
          </h1>
          <p className="text-lg text-neutral-600">
            Bringing affordable luxury and essential fashion to Nigeria
          </p>
        </div>

        {/* Brand Story */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
          <div className="space-y-4 text-neutral-600">
            <p>
              Founded in 2024, Maison De Valeur (MDV) was born from a simple observation: 
              quality fashion shouldn't be a luxury reserved for the few. We believe that 
              everyone deserves access to well-made, stylish clothing that doesn't break the bank.
            </p>
            <p>
              Our name, "House of Value," reflects our core mission - to be Nigeria's premier 
              destination for affordable essentials and carefully curated last-season fashion 
              from international brands. We bridge the gap between quality and affordability, 
              making fashion accessible to all.
            </p>
            <p>
              Starting from Lagos, we've grown to serve customers across Nigeria, offering a 
              seamless online shopping experience with reliable delivery and exceptional customer 
              service through our dedicated WhatsApp support.
            </p>
          </div>
        </Card>

        {/* Mission & Values */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">Our Mission</h3>
            <p className="text-sm text-neutral-600">
              To democratize fashion by making quality clothing accessible and affordable for 
              every Nigerian.
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="text-3xl mb-3">💎</div>
            <h3 className="font-semibold mb-2">Quality Promise</h3>
            <p className="text-sm text-neutral-600">
              Every item is carefully selected to ensure it meets our standards for quality, 
              style, and value.
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="font-semibold mb-2">Customer First</h3>
            <p className="text-sm text-neutral-600">
              Your satisfaction is our priority. We're always available via WhatsApp to help 
              with any questions or concerns.
            </p>
          </Card>
        </div>

        {/* Why Choose MDV */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Why Choose MDV?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="text-maroon-700 text-2xl">✓</div>
              <div>
                <h4 className="font-medium mb-1">Authentic Products</h4>
                <p className="text-sm text-neutral-600">
                  100% genuine items from trusted international brands
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-maroon-700 text-2xl">✓</div>
              <div>
                <h4 className="font-medium mb-1">Unbeatable Prices</h4>
                <p className="text-sm text-neutral-600">
                  Last-season luxury at prices that make sense
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-maroon-700 text-2xl">✓</div>
              <div>
                <h4 className="font-medium mb-1">Nigeria-Focused</h4>
                <p className="text-sm text-neutral-600">
                  Designed for Nigerian customers, with local payment and delivery
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-maroon-700 text-2xl">✓</div>
              <div>
                <h4 className="font-medium mb-1">Personal Support</h4>
                <p className="text-sm text-neutral-600">
                  Direct WhatsApp access to our customer service team
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact CTA */}
        <div className="text-center bg-neutral-50 rounded-lg p-8">
          <h3 className="text-xl font-semibold mb-4">Have Questions?</h3>
          <p className="text-neutral-600 mb-6">
            We're here to help! Reach out to us on WhatsApp for immediate assistance.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              variant="primary"
              onClick={() => window.open("https://wa.me/+2348136514087", "_blank")}
            >
              Chat on WhatsApp
            </Button>
            <Button 
              variant="secondary"
              onClick={() => window.location.href = "/contact"}
            >
              Contact Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
