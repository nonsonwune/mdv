"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "../../../lib/api";
import { clearStoredCartId } from "../../../lib/cart";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircleIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import "./receipt-styles.css";

// Types for order data
interface OrderItem {
  id: number;
  variant_id: number;
  product_name: string;
  variant_sku: string;
  size: string;
  color: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  on_sale: boolean;
}

interface ShippingAddress {
  name: string;
  phone: string;
  state: string;
  city: string;
  street: string;
}

interface OrderDetails {
  id: number;
  status: string;
  totals: {
    subtotal: number;
    shipping_fee: number;
    tax: number;
    discount: number;
    total: number;
  };
  created_at: string;
  items: OrderItem[];
  shipping_address: ShippingAddress;
  tracking_available: boolean;
}

export default function CheckoutCallbackPage() {
  const [status, setStatus] = useState<string>("PendingPayment");
  const [message, setMessage] = useState<string>("Confirming payment…");
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const sp = useSearchParams();
  const orderId = Number(sp.get("order_id"));
  const reference = sp.get("ref") || sp.get("reference") || sp.get("trxref");

  useEffect(() => {
    if (!Number.isFinite(orderId)) {
      setMessage("Missing order id");
      setError("Invalid order ID");
      setLoading(false);
      return;
    }

    let tries = 0;
    const iv = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/tracking`, { cache: "no-store" });
        const data = await res.json();
        setStatus(data.status);

        if (data.status === "Paid") {
          setMessage("Payment confirmed. Thank you!");
          clearStoredCartId(); // Clear the cart ID from localStorage
          clearInterval(iv);

          // Fetch detailed order information for receipt
          await fetchOrderDetails();
          setShowReceipt(true);
        } else if (tries > 30) {
          setMessage("Still pending. Please wait or contact support if this persists.");
          clearInterval(iv);
          setLoading(false);
        }
      } catch (e) {
        console.error("Error checking payment status:", e);
        if (tries > 5) {
          setError("Unable to verify payment status");
          setLoading(false);
          clearInterval(iv);
        }
      }
    }, 1500);

    return () => clearInterval(iv);
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      if (!reference) {
        console.warn("No reference available for receipt fetch");
        setLoading(false);
        return;
      }

      // Use the new public receipt endpoint
      const res = await fetch(
        `${API_BASE}/api/orders/${orderId}/receipt?reference=${encodeURIComponent(reference)}`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const receiptData = await res.json();
        setOrderDetails(receiptData);
      } else {
        console.warn("Failed to fetch receipt details, falling back to basic confirmation");
        // Fall back to basic confirmation without detailed order info
        setOrderDetails({
          id: orderId,
          status: "Paid",
          totals: {
            subtotal: 0,
            shipping_fee: 0,
            tax: 0,
            discount: 0,
            total: 0
          },
          created_at: new Date().toISOString(),
          items: [],
          shipping_address: {
            name: "",
            phone: "",
            state: "",
            city: "",
            street: ""
          },
          tracking_available: true
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      // Continue with basic confirmation if detailed fetch fails
      setOrderDetails({
        id: orderId,
        status: "Paid",
        totals: {
          subtotal: 0,
          shipping_fee: 0,
          tax: 0,
          discount: 0,
          total: 0
        },
        created_at: new Date().toISOString(),
        items: [],
        shipping_address: {
          name: "",
          phone: "",
          state: "",
          city: "",
          street: ""
        },
        tracking_available: true
      });
    } finally {
      setLoading(false);
    }
  };

  async function retryNow() {
    if (!Number.isFinite(orderId)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/tracking`, { cache: "no-store" });
      const data = await res.json();
      setStatus(data.status);
      setMessage(data.status === "Paid" ? "Payment confirmed. Thank you!" : "Still pending. Please wait.");

      if (data.status === "Paid") {
        await fetchOrderDetails();
        setShowReceipt(true);
      }
    } catch (error) {
      console.error("Error retrying payment check:", error);
      setError("Unable to check payment status");
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleEmailReceipt = () => {
    // In a real implementation, this would trigger an API call to email the receipt
    alert("Email receipt functionality would be implemented here");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-maroon-600 animate-spin" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Confirming Payment</h2>
          <p className="mt-2 text-gray-600">{message}</p>
          <div className="mt-6">
            <button
              onClick={retryNow}
              className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition-colors"
            >
              Check Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Payment Verification Error</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={retryNow}
              className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition-colors"
            >
              Try Again
            </button>
            <a
              href="https://wa.me/+2348136514087"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Contact Support
            </a>
          </div>
          <Link href="/" className="inline-block mt-4 text-maroon-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Pending payment state
  if (status !== "Paid" && !showReceipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <ClockIcon className="mx-auto h-12 w-12 text-yellow-600" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Payment Pending</h2>
          <p className="mt-2 text-gray-600">{message}</p>
          <p className="mt-1 text-sm text-gray-500">Status: {status}</p>

          {reference && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Transaction Reference:</p>
              <p className="font-mono text-sm font-medium">{reference}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={retryNow}
              className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition-colors"
            >
              Check Payment Status
            </button>
            <a
              href="https://wa.me/+2348136514087"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Contact Support
            </a>
          </div>
          <Link href="/" className="inline-block mt-4 text-maroon-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Success state with receipt
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Payment Successful!</h1>
          <p className="mt-2 text-lg text-gray-600">Thank you for your order. Your payment has been confirmed.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 print:hidden">
          <button
            onClick={handlePrint}
            className="receipt-action-button flex items-center px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition-colors"
          >
            <PrinterIcon className="h-5 w-5 mr-2" />
            Print Receipt
          </button>
          <button
            onClick={handleEmailReceipt}
            className="receipt-secondary-button flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <EnvelopeIcon className="h-5 w-5 mr-2" />
            Email Receipt
          </button>
          <Link
            href="/products"
            className="receipt-secondary-button flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ShoppingBagIcon className="h-5 w-5 mr-2" />
            Continue Shopping
          </Link>
        </div>

        {/* Receipt */}
        <div className="receipt-container bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Receipt Header */}
          <div className="receipt-header bg-maroon-600 text-white px-6 py-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">MDV</h2>
                <p className="text-maroon-100">Fashion & Lifestyle</p>
              </div>
              <div className="text-right">
                <p className="text-maroon-100">Order Receipt</p>
                <p className="text-xl font-bold">#{orderId}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number:</span>
                    <span className="font-medium">MDV-{orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium">
                      {orderDetails ? formatDate(orderDetails.created_at) : formatDate(new Date().toISOString())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="font-medium text-green-600">Paid</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium">Paystack</span>
                  </div>
                  {reference && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction Ref:</span>
                      <span className="font-mono text-xs font-medium">{reference}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {orderDetails?.shipping_address && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Shipping Address</h3>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-900">{orderDetails.shipping_address.name}</p>
                    <p>{orderDetails.shipping_address.street}</p>
                    <p>{orderDetails.shipping_address.city}, {orderDetails.shipping_address.state}</p>
                    <p className="mt-2">Phone: {orderDetails.shipping_address.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            {orderDetails?.items && orderDetails.items.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                <div className="overflow-x-auto">
                  <table className="receipt-table w-full text-sm no-break">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Item</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-900">Qty</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-900">Unit Price</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orderDetails.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{item.product_name}</p>
                              <p className="text-gray-500">
                                {[item.size, item.color].filter(Boolean).join(' • ')}
                              </p>
                              <p className="text-xs text-gray-400">SKU: {item.variant_sku}</p>
                              {item.on_sale && (
                                <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                  On Sale
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{item.qty}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  Order items are being processed. You will receive a detailed receipt via email shortly.
                </p>
              </div>
            )}

            {/* Order Totals */}
            {orderDetails?.totals && (
              <div className="border-t pt-6">
                <div className="max-w-sm ml-auto">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>{formatCurrency(orderDetails.totals.subtotal)}</span>
                    </div>
                    {orderDetails.totals.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(orderDetails.totals.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping:</span>
                      <span>
                        {orderDetails.totals.shipping_fee > 0
                          ? formatCurrency(orderDetails.totals.shipping_fee)
                          : 'Free'
                        }
                      </span>
                    </div>
                    {orderDetails.totals.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span>{formatCurrency(orderDetails.totals.tax)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(orderDetails.totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Information */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Delivery Information</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Your order will be processed within 1-2 business days</p>
                <p>• Estimated delivery: 3-7 business days</p>
                <p>• You will receive tracking information via email once your order ships</p>
                <p>• For urgent inquiries, contact us on WhatsApp: +234 813 651 4087</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t text-center text-sm text-gray-500">
              <p>Thank you for shopping with MDV!</p>
              <p className="mt-1">
                For support, contact us at{' '}
                <a href="mailto:support@mdv.com" className="text-maroon-600 hover:underline">
                  support@mdv.com
                </a>{' '}
                or{' '}
                <a
                  href="https://wa.me/+2348136514087"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-maroon-600 hover:underline"
                >
                  WhatsApp
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 text-center print:hidden">
          <Link
            href="/account/orders"
            className="receipt-action-button inline-flex items-center px-6 py-3 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition-colors"
          >
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
}

