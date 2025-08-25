"use client";

import { useEffect, useState } from "react";
import { 
  fetchCartOrCreate, 
  addItemWithRecovery, 
  updateCartItem, 
  removeCartItem, 
  clearCart as clearCartApi 
} from "../../lib/cart";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import CartSkeleton from "../_components/CartSkeleton";
import { useToast } from "../_components/ToastProvider";
import { formatNaira } from "../../lib/format";
import { EmptyState, Button, Card } from "../../components/ui";
import type { CartData } from "../../lib/cart";

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [savingForLater, setSavingForLater] = useState<number | null>(null);
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();

  async function loadCart() {
    try {
      setError(null);
      const data = await fetchCartOrCreate();
      setCart(data);
      
      // Show offline mode notification if needed
      if (data.id === -1) {
        toast.info("Offline Mode", "Your cart is saved locally and will sync when connection is restored.");
      }
    } catch (e: any) {
      console.error("Cart loading error:", e);
      setError("Unable to load cart. Please refresh the page.");
      // Still try to show offline cart if available
      setCart({ id: -1, items: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const add = sp.get("add");
      if (add) {
        const variantId = Number(add);
        if (Number.isFinite(variantId) && variantId > 0) {
          try {
            const data = await addItemWithRecovery(variantId, 1);
            setCart(data);
            toast.success("Item added to cart");
            // Remove the add parameter from URL
            router.replace("/cart");
          } catch (e) {
            console.error("Failed to add item:", e);
            toast.error("Failed to add item", "Please try again.");
          }
          setLoading(false);
          return;
        }
      }
      await loadCart();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  async function changeQty(itemId: number, qty: number) {
    if (!cart) return;
    
    setUpdatingItemId(itemId);
    try {
      const updatedCart = qty <= 0 
        ? await removeCartItem(cart.id, itemId)
        : await updateCartItem(cart.id, itemId, qty);
      
      setCart(updatedCart);
      
      if (qty <= 0) {
        toast.success("Item removed from cart");
      }
    } catch (e) {
      console.error("Cart update error:", e);
      toast.error("Failed to update cart", "Please try again.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function clearCart() {
    if (!cart || cart.items.length === 0) return;
    
    if (!confirm("Are you sure you want to clear your cart?")) return;
    
    try {
      const clearedCart = await clearCartApi(cart.id);
      setCart(clearedCart);
      toast.success("Cart cleared");
    } catch (e) {
      console.error("Clear cart error:", e);
      toast.error("Failed to clear cart", "Please try again.");
    }
  }

  function saveForLater(itemId: number) {
    // Store in localStorage for wishlist functionality
    setSavingForLater(itemId);
    const item = cart?.items.find(it => it.id === itemId);
    if (item) {
      const saved = JSON.parse(localStorage.getItem("mdv_saved_items") || "[]");
      saved.push({ ...item, savedAt: Date.now() });
      localStorage.setItem("mdv_saved_items", JSON.stringify(saved));
      changeQty(itemId, 0); // Remove from cart
      toast.success("Item saved for later");
    }
    setSavingForLater(null);
  }

  const subtotal = cart?.items.reduce((total, item) => {
    return total + (Number(item.price || 0) * Number(item.qty || 0));
  }, 0) || 0;

  const estimatedShipping = subtotal > 50000 ? 0 : 2500; // Free shipping over ₦50,000
  const estimatedTotal = subtotal + estimatedShipping;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <CartSkeleton />
      </div>
    );
  }

  if (error && (!cart || cart.items.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-10">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Unable to load cart"
          description={error}
          action={
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-neutral-600 mb-6">
          <Link href="/" className="hover:text-maroon-700">Home</Link>
          <span>/</span>
          <span className="text-neutral-900">Shopping Cart</span>
        </nav>

        <h1 className="text-3xl font-semibold mb-8" style={{ color: "var(--ink-700)" }}>
          Shopping Cart
          {cart && cart.items.length > 0 && (
            <span className="text-lg font-normal text-neutral-600 ml-2">
              ({cart.items.length} {cart.items.length === 1 ? "item" : "items"})
            </span>
          )}
        </h1>

        {cart && cart.items.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
            title="Your cart is empty"
            description="Start shopping to add items to your cart"
            action={
              <div className="flex gap-3">
                <Button onClick={() => router.push("/")} variant="primary">
                  Continue Shopping
                </Button>
                <Button onClick={() => router.push("/sale")} variant="secondary">
                  View Sale Items
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart?.items.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {item.image_url ? (
                        <Image 
                          src={item.image_url} 
                          alt={item.title || `Product ${item.variant_id}`}
                          width={100}
                          height={100}
                          className="w-24 h-24 object-cover rounded-lg bg-neutral-100"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">
                        {item.title || `Product Variant #${item.variant_id}`}
                      </h3>
                      
                      {typeof item.price === "number" && (
                        <div className="mt-1 text-sm text-neutral-600">
                          Unit price: {formatNaira(item.price)}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-4">
                        {/* Quantity Selector */}
                        <div className="flex items-center gap-2">
                          <button
                            className="w-8 h-8 rounded-full border border-neutral-300 hover:border-maroon-700 transition-colors flex items-center justify-center"
                            onClick={() => changeQty(item.id, item.qty - 1)}
                            disabled={updatingItemId === item.id}
                          >
                            <span className="text-lg leading-none">−</span>
                          </button>
                          <span className="w-12 text-center font-medium">{item.qty}</span>
                          <button
                            className="w-8 h-8 rounded-full border border-neutral-300 hover:border-maroon-700 transition-colors flex items-center justify-center"
                            onClick={() => changeQty(item.id, item.qty + 1)}
                            disabled={updatingItemId === item.id}
                          >
                            <span className="text-lg leading-none">+</span>
                          </button>
                        </div>

                        {/* Item Total */}
                        {typeof item.price === "number" && (
                          <div className="font-semibold text-lg">
                            {formatNaira(item.price * item.qty)}
                          </div>
                        )}
                      </div>

                      {/* Additional Actions */}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-neutral-100">
                        <button
                          className="text-sm text-neutral-600 hover:text-maroon-700 transition-colors"
                          onClick={() => saveForLater(item.id)}
                          disabled={savingForLater === item.id}
                        >
                          Save for later
                        </button>
                        <button
                          className="text-sm text-neutral-600 hover:text-danger transition-colors"
                          onClick={() => changeQty(item.id, 0)}
                          disabled={updatingItemId === item.id}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Clear Cart Button */}
              {cart && cart.items.length > 0 && (
                <div className="pt-4">
                  <Button variant="ghost" onClick={clearCart}>
                    Clear Cart
                  </Button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatNaira(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Estimated Shipping</span>
                    <span>
                      {estimatedShipping === 0 ? (
                        <span className="text-success">FREE</span>
                      ) : (
                        formatNaira(estimatedShipping)
                      )}
                    </span>
                  </div>
                  
                  {estimatedShipping > 0 && (
                    <div className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded">
                      Add {formatNaira(50000 - subtotal)} more for free shipping
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Estimated Total</span>
                      <span>{formatNaira(estimatedTotal)}</span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      Tax calculated at checkout
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button 
                    variant="primary" 
                    className="w-full"
                    onClick={() => router.push("/checkout")}
                  >
                    Proceed to Checkout
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => router.push("/")}
                  >
                    Continue Shopping
                  </Button>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t space-y-2">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Secure Checkout</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h4.05C18.574 7 19 7.426 19 7.95c0 .524-.426.95-.95.95H14v1h3.05c.524 0 .95.426.95.95s-.426.95-.95.95H14v1h2.05c.524 0 .95.426.95.95s-.426.95-.95.95H14v1h1.05c.524 0 .95.426.95.95s-.426.95-.95.95H14a1 1 0 01-1-1V8a1 1 0 011-1z" />
                    </svg>
                    <span>Free Shipping Over ₦50,000</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

