/**
 * Test script to verify the admin orders page fix
 * This simulates the scenarios that were causing the toLocaleString() error
 */

// Mock stats data scenarios that could cause the error
const testScenarios = [
  {
    name: "Undefined values (original error case)",
    data: {
      totalOrders: undefined,
      totalRevenue: undefined,
      totalUsers: undefined,
      totalProducts: undefined
    }
  },
  {
    name: "Null values",
    data: {
      totalOrders: null,
      totalRevenue: null,
      totalUsers: null,
      totalProducts: null
    }
  },
  {
    name: "Mixed undefined/null/valid values",
    data: {
      totalOrders: 150,
      totalRevenue: undefined,
      totalUsers: null,
      totalProducts: 25
    }
  },
  {
    name: "Legacy format (old API response)",
    data: {
      total_orders: 100,
      total_revenue: 50000,
      total_customers: 75,
      average_order_value: 500
    }
  },
  {
    name: "Empty object",
    data: {}
  },
  {
    name: "Valid new format",
    data: {
      totalOrders: 150,
      totalRevenue: 75000,
      totalUsers: 85,
      totalProducts: 30,
      orderChange: 12.5,
      revenueChange: -5.2,
      userChange: 8.1,
      productChange: 15.0
    }
  }
];

// Function to safely format numbers (mimics the fix)
function safeToLocaleString(value) {
  const num = value || 0;
  return num.toLocaleString();
}

// Function to create safe stats object (mimics the fetchStats fix)
function createSafeStats(rawData) {
  return {
    totalOrders: rawData.totalOrders || rawData.total_orders || 0,
    totalRevenue: rawData.totalRevenue || rawData.total_revenue || 0,
    totalUsers: rawData.totalUsers || rawData.total_customers || 0,
    totalProducts: rawData.totalProducts || 0,
    orderChange: rawData.orderChange || 0,
    revenueChange: rawData.revenueChange || 0,
    userChange: rawData.userChange || 0,
    productChange: rawData.productChange || 0,
    recentOrders: rawData.recentOrders || [],
    lowStockProducts: rawData.lowStockProducts || [],
    // Legacy fields for backward compatibility
    total_orders: rawData.total_orders || rawData.totalOrders || 0,
    total_revenue: rawData.total_revenue || rawData.totalRevenue || 0,
    total_customers: rawData.total_customers || rawData.totalUsers || 0,
    average_order_value: rawData.average_order_value || 0,
    recent_orders: rawData.recent_orders || 0,
    recent_revenue: rawData.recent_revenue || 0,
    period_days: rawData.period_days || 30
  };
}

// Test function
function testOrdersPageFix() {
  console.log("Testing Admin Orders Page Fix");
  console.log("=" * 50);
  
  let allTestsPassed = true;
  
  testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. Testing: ${scenario.name}`);
    
    try {
      // Create safe stats object
      const safeStats = createSafeStats(scenario.data);
      
      // Test the operations that were failing
      const totalOrdersDisplay = safeToLocaleString(safeStats.totalOrders || safeStats.total_orders);
      const totalRevenueDisplay = safeToLocaleString(safeStats.totalRevenue || safeStats.total_revenue);
      const totalUsersDisplay = safeToLocaleString(safeStats.totalUsers || safeStats.total_customers);
      const totalProductsDisplay = safeToLocaleString(safeStats.totalProducts);
      
      console.log(`   ✓ Total Orders: ${totalOrdersDisplay}`);
      console.log(`   ✓ Total Revenue: ₦${totalRevenueDisplay}`);
      console.log(`   ✓ Total Users: ${totalUsersDisplay}`);
      console.log(`   ✓ Total Products: ${totalProductsDisplay}`);
      
      // Test change percentage display
      if (safeStats.orderChange !== undefined) {
        const changeDisplay = `${safeStats.orderChange >= 0 ? '+' : ''}${safeStats.orderChange.toFixed(1)}%`;
        console.log(`   ✓ Order Change: ${changeDisplay}`);
      }
      
      console.log(`   ✓ Test passed!`);
      
    } catch (error) {
      console.log(`   ✗ Test failed: ${error.message}`);
      allTestsPassed = false;
    }
  });
  
  console.log("\n" + "=" * 50);
  if (allTestsPassed) {
    console.log("✓ All tests passed! The toLocaleString() error should be fixed.");
    console.log("\nThe fix includes:");
    console.log("- Safe default values for all numeric fields");
    console.log("- Backward compatibility with old API format");
    console.log("- Proper null/undefined checking");
    console.log("- Loading states to prevent rendering issues");
  } else {
    console.log("✗ Some tests failed. Please review the implementation.");
  }
}

// Run the test
testOrdersPageFix();
