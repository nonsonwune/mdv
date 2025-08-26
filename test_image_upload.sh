#!/bin/bash

# Test Cloudinary image upload functionality for MDV

API_URL="https://mdv-api-production.up.railway.app"
WEB_URL="https://mdv-web-production.up.railway.app"

echo "=========================================="
echo "MDV Image Upload Test Script"
echo "=========================================="
echo ""

# Step 1: Login as admin
echo "Step 1: Logging in as admin..."
echo "-----------------------------------------"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mdv.ng","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Failed to login. Response:"
    echo $LOGIN_RESPONSE | jq
    echo ""
    echo "Let's try with the web proxy endpoint..."
    
    # Try web proxy
    LOGIN_RESPONSE=$(curl -s -X POST "$WEB_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@mdv.ng","password":"admin123"}')
    
    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
    
    if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
        echo "❌ Failed to login via web proxy too. Response:"
        echo $LOGIN_RESPONSE | jq
        exit 1
    fi
fi

echo "✅ Successfully logged in"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Create a test product
echo "Step 2: Creating a test product..."
echo "-----------------------------------------"

PRODUCT_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product for Image Upload",
    "slug": "test-product-image-upload",
    "description": "Testing Cloudinary image upload",
    "compare_at_price": 15000,
    "flags": {"is_new": true, "featured": false},
    "category_id": null,
    "variants": [
      {
        "sku": "TEST-IMG-001",
        "size": "M",
        "color": "Blue",
        "price": 10000,
        "initial_quantity": 10,
        "safety_stock": 5
      }
    ]
  }')

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | jq -r '.id')

if [ "$PRODUCT_ID" == "null" ] || [ -z "$PRODUCT_ID" ]; then
    echo "❌ Failed to create product. Response:"
    echo $PRODUCT_RESPONSE | jq
    exit 1
fi

echo "✅ Product created with ID: $PRODUCT_ID"
echo ""

# Step 3: Create a test image
echo "Step 3: Creating test image..."
echo "-----------------------------------------"

# Create a simple test image using ImageMagick or download one
if command -v convert &> /dev/null; then
    convert -size 400x400 xc:skyblue -pointsize 40 -gravity center -annotate +0+0 "MDV TEST" test_product_image.jpg
    echo "✅ Created test image with ImageMagick"
elif command -v curl &> /dev/null; then
    curl -s -o test_product_image.jpg "https://via.placeholder.com/400x400/87CEEB/000000?text=MDV+TEST"
    echo "✅ Downloaded test image from placeholder service"
else
    echo "❌ Cannot create test image. Please install ImageMagick or ensure curl is available"
    exit 1
fi

# Step 4: Upload image to product
echo ""
echo "Step 4: Uploading image to Cloudinary..."
echo "-----------------------------------------"

UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/products/$PRODUCT_ID/images" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_product_image.jpg" \
  -F "alt_text=Test Product Image" \
  -F "is_primary=true")

IMAGE_URL=$(echo $UPLOAD_RESPONSE | jq -r '.url')
PUBLIC_ID=$(echo $UPLOAD_RESPONSE | jq -r '.public_id')

if [ "$IMAGE_URL" == "null" ] || [ -z "$IMAGE_URL" ]; then
    echo "❌ Failed to upload image. Response:"
    echo $UPLOAD_RESPONSE | jq
    
    # Check if it's a Cloudinary configuration issue
    if echo $UPLOAD_RESPONSE | grep -q "Cloudinary"; then
        echo ""
        echo "⚠️  Cloudinary configuration issue detected"
        echo "Please ensure CLOUDINARY_URL is properly set in Railway environment variables"
    fi
else
    echo "✅ Image uploaded successfully!"
    echo "   Image URL: $IMAGE_URL"
    echo "   Public ID: $PUBLIC_ID"
    echo ""
    
    # Step 5: Verify image is accessible
    echo "Step 5: Verifying image accessibility..."
    echo "-----------------------------------------"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_URL")
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo "✅ Image is accessible at: $IMAGE_URL"
    else
        echo "⚠️  Image URL returned status code: $HTTP_CODE"
    fi
fi

# Step 6: Get product details to verify image association
echo ""
echo "Step 6: Verifying image association..."
echo "-----------------------------------------"

PRODUCT_DETAILS=$(curl -s -X GET "$API_URL/api/admin/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN")

IMAGE_COUNT=$(echo $PRODUCT_DETAILS | jq '.images | length')

if [ "$IMAGE_COUNT" -gt 0 ]; then
    echo "✅ Product has $IMAGE_COUNT image(s) associated"
    echo "Images:"
    echo $PRODUCT_DETAILS | jq '.images[] | {id, url, is_primary}'
else
    echo "⚠️  No images found associated with the product"
fi

# Cleanup
echo ""
echo "Step 7: Cleanup..."
echo "-----------------------------------------"

# Delete test product
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/admin/products/$PRODUCT_ID?force=true" \
  -H "Authorization: Bearer $TOKEN")

if echo $DELETE_RESPONSE | grep -q "success"; then
    echo "✅ Test product deleted"
else
    echo "⚠️  Could not delete test product"
fi

# Remove test image file
rm -f test_product_image.jpg
echo "✅ Removed test image file"

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
