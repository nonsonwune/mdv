"use client"

import { useState } from "react"
import { Button, Card, Alert } from "../../components/ui"
import { useToast } from "../_components/ToastProvider"

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Store in localStorage for mock functionality
    const submissions = JSON.parse(localStorage.getItem("mdv_contact_submissions") || "[]")
    submissions.push({ ...form, timestamp: Date.now() })
    localStorage.setItem("mdv_contact_submissions", JSON.stringify(submissions))
    
    toast.success("Message sent!", "We'll get back to you within 24 hours.")
    setForm({ name: "", email: "", subject: "", message: "" })
    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Contact Us</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  className="textarea"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              
              <Button type="submit" variant="primary" loading={loading} className="w-full">
                Send Message
              </Button>
            </form>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-3">WhatsApp Support</h3>
              <p className="text-sm text-neutral-600 mb-3">
                For immediate assistance, reach us on WhatsApp
              </p>
              <a
                href="https://wa.me/+2348136514087"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-maroon-700 hover:text-maroon-800 font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1.01 1.01 0 0 0 3.8 21.454l3.032-.892A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.592 0-3.138-.467-4.469-1.35l-.321-.213-3.332.874.894-3.264-.216-.344A7.957 7.957 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
                </svg>
                +234 813 651 4087
              </a>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-3">Business Hours</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Monday - Friday</span>
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Saturday</span>
                  <span>10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Sunday</span>
                  <span>Closed</span>
                </div>
                <p className="text-xs text-neutral-500 pt-2">All times in WAT (West Africa Time)</p>
              </div>
            </Card>

            <Alert variant="info" title="Response Time">
              We typically respond to inquiries within 2-4 hours during business hours. 
              For urgent matters, please contact us via WhatsApp.
            </Alert>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "How can I track my order?",
                a: "Once your order ships, you'll receive a tracking number via email and SMS. You can also track your order in your account dashboard."
              },
              {
                q: "What is your return policy?",
                a: "We accept returns within 7 days of delivery for items in original condition with tags attached. See our Returns page for full details."
              },
              {
                q: "Do you offer international shipping?",
                a: "Currently, we only ship within Nigeria. We're working on expanding to other West African countries soon."
              },
              {
                q: "How long does delivery take?",
                a: "Lagos: 1-2 business days. Other states: 3-5 business days. Express delivery options are available at checkout."
              }
            ].map((faq, i) => (
              <Card key={i} className="p-4">
                <h3 className="font-medium mb-2">{faq.q}</h3>
                <p className="text-sm text-neutral-600">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
