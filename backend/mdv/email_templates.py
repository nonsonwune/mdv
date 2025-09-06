"""
Email templates for MDV notifications.
"""
from __future__ import annotations

from typing import Any, Dict
from decimal import Decimal


def format_naira(amount: float | Decimal) -> str:
    """Format amount as Naira currency."""
    return f"₦{amount:,.2f}"


def order_confirmation_email(order_data: Dict[str, Any]) -> tuple[str, str]:
    """Generate order confirmation email.
    
    Returns:
        tuple: (subject, html_body)
    """
    order_id = order_data.get("id", "N/A")
    customer_name = order_data.get("customer_name", "Customer")
    items = order_data.get("items", [])
    totals = order_data.get("totals", {})
    address = order_data.get("address", {})
    
    # Build items HTML
    items_html = ""
    for item in items:
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
                <strong>{item.get('title', 'Product')}</strong><br>
                <span style="color: #666; font-size: 14px;">
                    {item.get('variant', '')}
                </span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">
                {item.get('qty', 1)}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                {format_naira(item.get('price', 0))}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                {format_naira(item.get('subtotal', 0))}
            </td>
        </tr>
        """
    
    subject = f"Order Confirmation - #{order_id}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background-color: #800000; color: #ffffff; padding: 30px 20px; text-align: center;">
                <img src="https://mdv.ng/images/mdv-logo-rlogomark-wtext-nobg.png"
                     alt="MDV - Maison De Valeur"
                     style="width: 200px; height: auto; max-width: 100%;" />
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">
                    Thank you for your order, {customer_name}!
                </h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                    We've received your order and will begin processing it right away. 
                    You'll receive another email when your order ships.
                </p>
                
                <!-- Order Details Box -->
                <div style="background-color: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="color: #333; font-size: 18px; margin-top: 0;">
                        Order #{order_id}
                    </h3>
                    <p style="color: #666; margin: 5px 0;">
                        <strong>Order Date:</strong> {order_data.get('created_at', 'Today')}
                    </p>
                    <p style="color: #666; margin: 5px 0;">
                        <strong>Payment Status:</strong> 
                        <span style="color: #00a651;">Confirmed</span>
                    </p>
                </div>
                
                <!-- Items Table -->
                <h3 style="color: #333; font-size: 18px; margin-bottom: 15px;">Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                    <thead>
                        <tr style="background-color: #f9f9f9;">
                            <th style="padding: 12px; text-align: left; font-size: 14px; color: #666;">Item</th>
                            <th style="padding: 12px; text-align: center; font-size: 14px; color: #666;">Qty</th>
                            <th style="padding: 12px; text-align: right; font-size: 14px; color: #666;">Price</th>
                            <th style="padding: 12px; text-align: right; font-size: 14px; color: #666;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <!-- Order Summary -->
                <div style="border-top: 2px solid #e5e5e5; padding-top: 20px; margin-bottom: 25px;">
                    <table style="width: 100%; max-width: 300px; margin-left: auto;">
                        <tr>
                            <td style="padding: 5px 0; color: #666;">Subtotal:</td>
                            <td style="padding: 5px 0; text-align: right;">
                                {format_naira(totals.get('subtotal', 0))}
                            </td>
                        </tr>
                        {f'''
                        <tr>
                            <td style="padding: 5px 0; color: #666;">Discount:</td>
                            <td style="padding: 5px 0; text-align: right; color: #00a651;">
                                -{format_naira(totals.get('discount', 0))}
                            </td>
                        </tr>
                        ''' if totals.get('discount', 0) > 0 else ''}
                        <tr>
                            <td style="padding: 5px 0; color: #666;">Shipping:</td>
                            <td style="padding: 5px 0; text-align: right;">
                                {format_naira(totals.get('shipping_fee', 0)) if totals.get('shipping_fee', 0) > 0 else 'FREE'}
                            </td>
                        </tr>
                        <tr style="border-top: 1px solid #e5e5e5; font-weight: bold;">
                            <td style="padding: 10px 0 5px 0; color: #333; font-size: 18px;">Total:</td>
                            <td style="padding: 10px 0 5px 0; text-align: right; color: #333; font-size: 18px;">
                                {format_naira(totals.get('total', 0))}
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Shipping Address -->
                <div style="background-color: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="color: #333; font-size: 18px; margin-top: 0;">Shipping Address</h3>
                    <p style="color: #666; margin: 5px 0; line-height: 1.5;">
                        {address.get('name', '')}<br>
                        {address.get('street', '')}<br>
                        {address.get('city', '')}, {address.get('state', '')}<br>
                        Phone: {address.get('phone', '')}
                    </p>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{order_data.get('app_url', 'https://mdv.ng')}/orders/{order_id}" 
                       style="display: inline-block; background-color: #800000; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 500;">
                        Track Your Order
                    </a>
                </div>
                
                <!-- Support Info -->
                <div style="background-color: #fef9e7; border: 1px solid #f9e79f; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        <strong>Need Help?</strong><br>
                        WhatsApp: +234 813 651 4087<br>
                        Email: support@mdv.ng<br>
                        Hours: Monday - Saturday, 9:00 AM - 6:00 PM WAT
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2024 Maison De Valeur. All rights reserved.
                </p>
                <p style="color: #999; font-size: 12px; margin: 5px 0;">
                    This email was sent to {order_data.get('email', '')} regarding order #{order_id}
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return subject, html


def shipping_confirmation_email(order_data: Dict[str, Any]) -> tuple[str, str]:
    """Generate shipping confirmation email.
    
    Returns:
        tuple: (subject, html_body)
    """
    order_id = order_data.get("id", "N/A")
    customer_name = order_data.get("customer_name", "Customer")
    tracking_number = order_data.get("tracking_number", "")
    carrier = order_data.get("carrier", "Our courier partner")
    estimated_delivery = order_data.get("estimated_delivery", "2-3 business days")
    
    subject = f"Your Order #{order_id} Has Shipped!"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shipping Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background-color: #800000; color: #ffffff; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 600;">MDV</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Your Order is On Its Way!</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">
                    Great news, {customer_name}!
                </h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                    Your order has been shipped and is on its way to you. 
                    Track your package using the information below.
                </p>
                
                <!-- Shipping Details Box -->
                <div style="background-color: #f0f8ff; border: 2px solid #4a90e2; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="color: #333; font-size: 18px; margin-top: 0;">
                        Shipping Details
                    </h3>
                    <p style="color: #666; margin: 10px 0;">
                        <strong>Order Number:</strong> #{order_id}
                    </p>
                    {f'''
                    <p style="color: #666; margin: 10px 0;">
                        <strong>Tracking Number:</strong> {tracking_number}
                    </p>
                    ''' if tracking_number else ''}
                    <p style="color: #666; margin: 10px 0;">
                        <strong>Carrier:</strong> {carrier}
                    </p>
                    <p style="color: #666; margin: 10px 0;">
                        <strong>Estimated Delivery:</strong> {estimated_delivery}
                    </p>
                </div>
                
                <!-- Track Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{order_data.get('app_url', 'https://mdv.ng')}/orders/{order_id}/tracking" 
                       style="display: inline-block; background-color: #4a90e2; color: #ffffff; padding: 12px 40px; text-decoration: none; border-radius: 5px; font-weight: 500;">
                        Track Your Package
                    </a>
                </div>
                
                <!-- Tips -->
                <div style="background-color: #f9f9f9; border-left: 4px solid #800000; padding: 15px; margin-bottom: 25px;">
                    <h4 style="color: #333; margin-top: 0;">Delivery Tips:</h4>
                    <ul style="color: #666; margin: 10px 0; padding-left: 20px; line-height: 1.6;">
                        <li>Please ensure someone is available to receive the package</li>
                        <li>Keep your phone on for delivery updates</li>
                        <li>Have your order number ready for reference</li>
                    </ul>
                </div>
                
                <!-- Support Info -->
                <div style="background-color: #fef9e7; border: 1px solid #f9e79f; border-radius: 8px; padding: 15px;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        <strong>Questions about your delivery?</strong><br>
                        WhatsApp: +234 813 651 4087<br>
                        We're here to help!
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2024 Maison De Valeur. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return subject, html


def password_reset_email(reset_data: Dict[str, Any]) -> tuple[str, str]:
    """Generate password reset email.
    
    Returns:
        tuple: (subject, html_body)
    """
    customer_name = reset_data.get("name", "Customer")
    reset_link = reset_data.get("reset_link", "")
    
    subject = "Reset Your MDV Password"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background-color: #800000; color: #ffffff; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 600;">MDV</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Password Reset Request</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">
                    Hello {customer_name},
                </h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                    We received a request to reset your password. Click the button below to create a new password.
                </p>
                
                <!-- Reset Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="display: inline-block; background-color: #800000; color: #ffffff; padding: 12px 40px; text-decoration: none; border-radius: 5px; font-weight: 500;">
                        Reset Password
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 25px;">
                    Or copy and paste this link into your browser:<br>
                    <span style="color: #4a90e2; word-break: break-all;">{reset_link}</span>
                </p>
                
                <!-- Security Notice -->
                <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>⚠️ Security Notice:</strong><br>
                        • This link will expire in 1 hour<br>
                        • If you didn't request this reset, please ignore this email<br>
                        • Your password won't change until you create a new one
                    </p>
                </div>
                
                <!-- Support -->
                <p style="color: #999; font-size: 14px; margin-top: 30px;">
                    Need help? Contact us at support@mdv.ng or WhatsApp +234 813 651 4087
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2024 Maison De Valeur. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return subject, html


def welcome_email(user_data: Dict[str, Any]) -> tuple[str, str]:
    """Generate welcome email for new registrations.
    
    Returns:
        tuple: (subject, html_body)
    """
    customer_name = user_data.get("name", "Customer")
    
    subject = "Welcome to MDV - Your Account is Ready!"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to MDV</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background-color: #800000; color: #ffffff; padding: 40px 20px; text-align: center;">
                <img src="https://mdv.ng/images/mdv-logo-rlogomark-wtext-nobg.png"
                     alt="MDV - Maison De Valeur"
                     style="width: 200px; height: auto; max-width: 100%; margin-bottom: 10px;" />
                <p style="margin: 0; font-size: 16px; opacity: 0.9;">Welcome to Affordable Essentials & Fashion</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">
                    Hello {customer_name}! 👋
                </h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                    Thank you for creating an account with Maison De Valeur. 
                    We're excited to have you as part of our community!
                </p>
                
                <!-- Benefits -->
                <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="color: #333; font-size: 18px; margin-top: 0;">
                        Your Member Benefits:
                    </h3>
                    <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                        <li>🚚 Free shipping on orders over ₦50,000 to Lagos</li>
                        <li>⚡ Faster checkout with saved addresses</li>
                        <li>📦 Easy order tracking and history</li>
                        <li>❤️ Save items to your wishlist</li>
                        <li>🎁 Exclusive member offers and early access to sales</li>
                    </ul>
                </div>
                
                <!-- CTA Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{user_data.get('app_url', 'https://mdv.ng')}" 
                       style="display: inline-block; background-color: #800000; color: #ffffff; padding: 12px 40px; text-decoration: none; border-radius: 5px; font-weight: 500; margin: 0 10px;">
                        Start Shopping
                    </a>
                </div>
                
                <!-- Categories -->
                <div style="margin: 30px 0;">
                    <h3 style="color: #333; font-size: 18px; text-align: center;">Popular Categories</h3>
                    <div style="display: table; width: 100%; margin-top: 15px;">
                        <a href="{user_data.get('app_url', 'https://mdv.ng')}/men" 
                           style="display: table-cell; width: 33.33%; text-align: center; padding: 15px; background-color: #f9f9f9; text-decoration: none; color: #333;">
                            <div style="font-size: 24px;">👔</div>
                            <div style="margin-top: 5px;">Men</div>
                        </a>
                        <a href="{user_data.get('app_url', 'https://mdv.ng')}/women" 
                           style="display: table-cell; width: 33.33%; text-align: center; padding: 15px; background-color: #fff; text-decoration: none; color: #333;">
                            <div style="font-size: 24px;">👗</div>
                            <div style="margin-top: 5px;">Women</div>
                        </a>
                        <a href="{user_data.get('app_url', 'https://mdv.ng')}/sale" 
                           style="display: table-cell; width: 33.33%; text-align: center; padding: 15px; background-color: #f9f9f9; text-decoration: none; color: #800000;">
                            <div style="font-size: 24px;">🏷️</div>
                            <div style="margin-top: 5px; font-weight: bold;">Sale</div>
                        </a>
                    </div>
                </div>
                
                <!-- Support -->
                <div style="background-color: #fef9e7; border: 1px solid #f9e79f; border-radius: 8px; padding: 15px; margin-top: 30px;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        <strong>Need Help Getting Started?</strong><br>
                        WhatsApp: +234 813 651 4087<br>
                        Email: support@mdv.ng<br>
                        We're here Monday - Saturday, 9 AM - 6 PM WAT
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2024 Maison De Valeur. All rights reserved.
                </p>
                <p style="color: #999; font-size: 12px; margin: 5px 0;">
                    Follow us for updates and exclusive offers!
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return subject, html
