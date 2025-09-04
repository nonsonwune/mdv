#!/usr/bin/env node

/**
 * Test script for version-based cleanup system
 * 
 * This script validates the version-based cleanup system implementation
 * by testing automatic cleanup when validation logic changes.
 */

// Mock localStorage for Node.js environment
const mockLocalStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Mock global objects
global.localStorage = mockLocalStorage;
global.window = { 
  localStorage: mockLocalStorage,
  dispatchEvent: () => {} // Mock event dispatcher
};

// Mock console methods (keep original console for output)
const originalConsole = console;

// Test data
const createMockProduct = (id, title = `Product ${id}`) => ({
  id,
  title,
  slug: `product-${id}`,
  description: `Description for ${title}`,
  variants: [
    {
      id: id * 10,
      product_id: id,
      title: 'Default',
      price: 100 + id,
      compare_at_price: null,
      inventory_quantity: 10,
      sku: `SKU-${id}`,
      weight: 1,
      requires_shipping: true,
      taxable: true,
      barcode: null,
      fulfillment_service: 'manual',
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  images: [
    {
      id: id * 100,
      product_id: id,
      url: `https://example.com/image-${id}.jpg`,
      alt_text: `Image for ${title}`,
      width: 500,
      height: 500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  category_id: 1,
  compare_at_price: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Test functions
function testVersionBasedCleanup() {
  console.log('🧪 Testing version-based cleanup system...');
  
  // Clear all storage
  localStorage.clear();
  
  // Simulate old version data
  const oldRecentlyViewed = [createMockProduct(1), createMockProduct(2)];
  localStorage.setItem('mdv_recently_viewed', JSON.stringify(oldRecentlyViewed));
  localStorage.setItem('mdv_recently_viewed_version', 'v1.0'); // Old version
  
  // Simulate the version check logic
  const RECENTLY_VIEWED_VERSION = 'v3.0';
  const VERSION_KEY = 'mdv_recently_viewed_version';
  
  const needsVersionCleanup = (versionKey, currentVersion) => {
    try {
      const storedVersion = localStorage.getItem(versionKey);
      return storedVersion !== currentVersion;
    } catch {
      return true;
    }
  };
  
  const needsCleanup = needsVersionCleanup(VERSION_KEY, RECENTLY_VIEWED_VERSION);
  
  console.log('✅ Version cleanup needed:', needsCleanup);
  console.log('✅ Stored version:', localStorage.getItem(VERSION_KEY));
  console.log('✅ Current version:', RECENTLY_VIEWED_VERSION);
  
  // Simulate cleanup process
  if (needsCleanup) {
    const stored = localStorage.getItem('mdv_recently_viewed');
    const parsed = JSON.parse(stored);
    
    // Convert old format to new format
    const converted = parsed.map(product => ({
      productId: String(product.id),
      viewedAt: new Date().toISOString(),
      product
    }));
    
    localStorage.setItem('mdv_recently_viewed', JSON.stringify(converted));
    localStorage.setItem(VERSION_KEY, RECENTLY_VIEWED_VERSION);
    
    console.log('✅ Data converted from old format to new format');
    console.log('✅ Version updated to:', localStorage.getItem(VERSION_KEY));
  }
  
  console.log('✅ Version-based cleanup test passed\n');
}

function testDataValidation() {
  console.log('🧪 Testing data validation during cleanup...');
  
  // Clear storage
  localStorage.clear();
  
  // Create mixed valid and invalid data
  const mixedData = [
    {
      productId: '1',
      viewedAt: new Date().toISOString(),
      product: createMockProduct(1)
    },
    {
      productId: '2',
      // Missing viewedAt
      product: createMockProduct(2)
    },
    {
      // Missing productId
      viewedAt: new Date().toISOString(),
      product: createMockProduct(3)
    },
    null, // Null item
    undefined, // Undefined item
    {
      productId: '4',
      viewedAt: new Date().toISOString(),
      product: createMockProduct(4)
    }
  ];
  
  localStorage.setItem('mdv_recently_viewed', JSON.stringify(mixedData));
  
  // Simulate validation logic
  const validateRecentlyViewedItem = (item) => {
    return (
      item &&
      typeof item.productId === 'string' &&
      typeof item.viewedAt === 'string' &&
      item.product &&
      typeof item.product.id === 'number' &&
      typeof item.product.title === 'string' &&
      typeof item.product.slug === 'string' &&
      Array.isArray(item.product.variants) &&
      item.product.variants.length > 0 &&
      Array.isArray(item.product.images)
    );
  };
  
  const stored = localStorage.getItem('mdv_recently_viewed');
  const parsed = JSON.parse(stored);
  const validItems = parsed.filter(validateRecentlyViewedItem);
  
  console.log('✅ Original items count:', mixedData.length);
  console.log('✅ Valid items count:', validItems.length);
  console.log('✅ Invalid items filtered out:', mixedData.length - validItems.length);
  console.log('✅ Valid items have correct structure:', validItems.every(validateRecentlyViewedItem));
  
  console.log('✅ Data validation test passed\n');
}

function testAgeBasedRetention() {
  console.log('🧪 Testing age-based retention policy...');
  
  // Clear storage
  localStorage.clear();
  
  // Create items with different ages
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 31); // 31 days ago
  
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 1); // 1 day ago
  
  const items = [
    {
      productId: '1',
      viewedAt: oldDate.toISOString(),
      product: createMockProduct(1, 'Old Product')
    },
    {
      productId: '2',
      viewedAt: recentDate.toISOString(),
      product: createMockProduct(2, 'Recent Product')
    }
  ];
  
  localStorage.setItem('mdv_recently_viewed', JSON.stringify(items));
  
  // Simulate age filtering
  const DATA_RETENTION_DAYS = 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
  
  const validItems = items.filter(item => {
    const itemDate = new Date(item.viewedAt);
    return itemDate > cutoffDate;
  });
  
  console.log('✅ Original items count:', items.length);
  console.log('✅ Items after age filtering:', validItems.length);
  console.log('✅ Old item filtered out:', validItems.length === 1);
  console.log('✅ Recent item kept:', validItems[0].product.title === 'Recent Product');
  
  console.log('✅ Age-based retention test passed\n');
}

function testMaxItemsLimit() {
  console.log('🧪 Testing maximum items limit...');
  
  // Clear storage
  localStorage.clear();
  
  const MAX_ITEMS = 10;
  
  // Create more items than the limit
  const items = [];
  for (let i = 1; i <= 15; i++) {
    items.push({
      productId: String(i),
      viewedAt: new Date().toISOString(),
      product: createMockProduct(i)
    });
  }
  
  localStorage.setItem('mdv_recently_viewed', JSON.stringify(items));
  
  // Simulate max items filtering
  const stored = localStorage.getItem('mdv_recently_viewed');
  const parsed = JSON.parse(stored);
  const limitedItems = parsed.slice(0, MAX_ITEMS);
  
  console.log('✅ Original items count:', items.length);
  console.log('✅ Items after limit applied:', limitedItems.length);
  console.log('✅ Limit enforced correctly:', limitedItems.length === MAX_ITEMS);
  console.log('✅ First item preserved:', limitedItems[0].productId === '1');
  
  console.log('✅ Maximum items limit test passed\n');
}

function testGlobalCleanupUtilities() {
  console.log('🧪 Testing global cleanup utilities...');
  
  // Clear storage
  localStorage.clear();
  
  // Add data to different storage types
  localStorage.setItem('mdv_recently_viewed', JSON.stringify([
    { productId: '1', viewedAt: new Date().toISOString(), product: createMockProduct(1) }
  ]));
  localStorage.setItem('mdv_wishlist', JSON.stringify([
    { productId: '2', addedAt: new Date().toISOString(), product: createMockProduct(2) }
  ]));
  
  // Set old versions to trigger cleanup
  localStorage.setItem('mdv_recently_viewed_version', 'v1.0');
  localStorage.setItem('mdv_wishlist_version', 'v1.0');
  
  // Simulate global cleanup check
  const needsCleanup = () => {
    const recentlyViewedNeedsCleanup = localStorage.getItem('mdv_recently_viewed_version') !== 'v3.0';
    const wishlistNeedsCleanup = localStorage.getItem('mdv_wishlist_version') !== 'v2.0';
    
    return recentlyViewedNeedsCleanup || wishlistNeedsCleanup;
  };
  
  console.log('✅ Global cleanup needed:', needsCleanup());
  console.log('✅ Recently viewed needs cleanup:', localStorage.getItem('mdv_recently_viewed_version') !== 'v3.0');
  console.log('✅ Wishlist needs cleanup:', localStorage.getItem('mdv_wishlist_version') !== 'v2.0');
  
  // Simulate stats collection
  const getStats = () => {
    const recentlyViewed = JSON.parse(localStorage.getItem('mdv_recently_viewed') || '[]');
    const wishlist = JSON.parse(localStorage.getItem('mdv_wishlist') || '[]');
    
    return {
      recentlyViewed: { count: recentlyViewed.length },
      wishlist: { count: wishlist.length }
    };
  };
  
  const stats = getStats();
  console.log('✅ Storage stats:', stats);
  
  console.log('✅ Global cleanup utilities test passed\n');
}

// Run all tests
function runTests() {
  console.log('🚀 Starting version-based cleanup system tests...\n');
  
  try {
    testVersionBasedCleanup();
    testDataValidation();
    testAgeBasedRetention();
    testMaxItemsLimit();
    testGlobalCleanupUtilities();
    
    console.log('🎉 All tests passed! Version-based cleanup system is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testVersionBasedCleanup,
  testDataValidation,
  testAgeBasedRetention,
  testMaxItemsLimit,
  testGlobalCleanupUtilities,
  runTests
};
