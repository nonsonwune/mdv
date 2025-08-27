# Error Handling Guidelines

## Overview

This document outlines the error handling patterns and best practices used throughout the MDV application, particularly for authentication and user experience.

## Authentication Error Handling

### Frontend Error Patterns

#### 1. Silent Handling on Public Pages
```typescript
// ✅ Good: Silent handling for expected 401s on public pages
if (response.status !== 401) {
  console.error('Auth check failed:', response.status)
}
```

#### 2. Graceful Redirects for Protected Pages
```typescript
// ✅ Good: Redirect with helpful error messages
if (error?.message?.includes('Not authenticated') || error?.message?.includes('401')) {
  window.location.href = '/staff-login?error=authentication_required'
  return
}
```

#### 3. User-Friendly Error Messages
```typescript
// ❌ Bad: Raw error exposure
throw new Error(JSON.stringify({detail: "Cart is empty"}))

// ✅ Good: User-friendly messages
if (errorText.includes('Cart is empty')) {
  toast.error("Cart is empty", "Please add items to your cart before checkout")
  setError("Your cart is empty. Please add some items before proceeding to checkout.")
  return
}
```

### Error Message Hierarchy

1. **User-Friendly Messages**: Primary message for users
2. **Technical Context**: Secondary technical details (optional)
3. **Action Guidance**: Clear next steps for users

### Authentication Flow Errors

#### Staff Authentication
- **401 on Admin Pages**: Redirect to `/staff-login?error=authentication_required`
- **403 Permission Denied**: Redirect to `/staff-login?error=insufficient_permissions`
- **Session Expired**: Redirect to `/staff-login?error=session_expired`

#### Customer Authentication  
- **401 on Customer Pages**: Redirect to `/customer-login?error=authentication_required`
- **Guest Checkout**: Allow graceful fallback to guest flow

## UI/UX Error Patterns

### Loading States
```typescript
// ✅ Always provide loading feedback
if (loading) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-700"></div>
    </div>
  )
}
```

### Empty States
```typescript
// ✅ Provide helpful empty state messages
{products.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-gray-500">No products found</p>
    <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
  </div>
) : (
  // Render products
)}
```

### Form Validation
```typescript
// ✅ Real-time validation with helpful messages
{error && (
  <div className="bg-red-50 border border-red-200 rounded-md p-4">
    <p className="text-sm text-red-600">{error}</p>
  </div>
)}
```

## Backend Error Handling

### API Response Patterns
```python
# ✅ Consistent error response structure
{
  "detail": "User-friendly error message",
  "code": "ERROR_CODE",
  "field": "specific_field"  # for validation errors
}
```

### HTTP Status Codes
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **422**: Unprocessable Entity (business logic errors)
- **500**: Internal Server Error

## Common Error Scenarios

### 1. Empty Cart Checkout
```typescript
// Before checkout submission
if (!cart || cart.items.length === 0) {
  toast.error("Cart is empty", "Please add items to your cart before checkout")
  setError("Your cart is empty. Please add some items before proceeding to checkout.")
  return
}
```

### 2. Network Connectivity
```typescript
// Distinguish network errors from business logic errors
if (error instanceof TypeError) {
  console.error('Network error:', error)
  setError("Connection error. Please check your internet and try again.")
}
```

### 3. Permission Denied
```typescript
// Role-based access control
const canManageUsers = usePermission('manage_users')
if (!canManageUsers) {
  return <div>Access denied. Please contact an administrator.</div>
}
```

## Testing Error Scenarios

### Manual Testing Checklist
- [ ] Authentication expiry during navigation
- [ ] Network disconnection during API calls
- [ ] Empty states for data lists
- [ ] Form validation edge cases
- [ ] Permission denied scenarios
- [ ] Long loading states

### Error Recovery Testing
- [ ] Refresh token functionality
- [ ] Retry mechanisms for failed requests
- [ ] Graceful degradation for offline mode
- [ ] Error message accessibility

## Best Practices

### Do's
- ✅ Log technical errors for debugging
- ✅ Show user-friendly messages to users
- ✅ Provide clear next steps or actions
- ✅ Handle loading and empty states
- ✅ Test error scenarios thoroughly

### Don'ts  
- ❌ Expose raw API errors to users
- ❌ Log expected authentication failures
- ❌ Leave users without feedback during loading
- ❌ Show technical stack traces to users
- ❌ Use generic error messages without context

## Recent Improvements (2024-08-27)

### Authentication Error Handling
- Silent 401 handling on public pages to reduce console noise
- Graceful redirects with contextual error messages
- Consistent authentication flow across admin and customer pages

### Checkout Error Handling
- Empty cart validation before payment processing
- User-friendly error messages instead of raw JSON
- Disabled states for invalid operations

### Visual Feedback
- Fixed invisible button issues with explicit styling
- Improved loading states and error boundaries
- Better contrast and accessibility for error states
