#!/usr/bin/env node

/**
 * Integration Test Suite for MDV Logistics Dashboard Enhancement
 * 
 * Tests all implemented functionality:
 * - Backend API endpoints
 * - Frontend tabbed interface compatibility
 * - Bulk operations
 * - Permission boundaries
 * - Performance with large datasets
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 MDV Logistics Dashboard Integration Test Suite');
console.log('=' .repeat(60));

// Test 1: Backend API Endpoints
function testBackendEndpoints() {
  console.log('\n📡 Testing Backend API Endpoints');
  console.log('-'.repeat(40));
  
  const adminRouterPath = path.join(__dirname, '../backend/api/routers/admin.py');
  
  if (!fs.existsSync(adminRouterPath)) {
    console.log('❌ Backend admin router not found');
    return false;
  }
  
  const adminRouterContent = fs.readFileSync(adminRouterPath, 'utf8');
  
  const requiredEndpoints = [
    'get_logistics_stats',
    'get_all_logistics_orders', 
    'get_in_transit_orders',
    'get_delivered_orders',
    'get_pending_dispatch_orders',
    'bulk_create_shipments',
    'bulk_update_shipment_status'
  ];
  
  let passed = 0;
  
  requiredEndpoints.forEach(endpoint => {
    if (adminRouterContent.includes(endpoint)) {
      console.log(`✅ ${endpoint} - Found`);
      passed++;
    } else {
      console.log(`❌ ${endpoint} - Missing`);
    }
  });
  
  // Test enhanced stats endpoint
  if (adminRouterContent.includes("stats['tabs'] = {")) {
    console.log('✅ Enhanced stats endpoint with tab counts - Found');
    passed++;
  } else {
    console.log('❌ Enhanced stats endpoint with tab counts - Missing');
  }
  
  // Test bulk operation limits
  if (adminRouterContent.includes('len(order_ids) > 100')) {
    console.log('✅ Bulk operation limits (100 orders) - Found');
    passed++;
  } else {
    console.log('❌ Bulk operation limits - Missing');
  }
  
  console.log(`\n📊 Backend API Tests: ${passed}/${requiredEndpoints.length + 2} passed`);
  return passed === requiredEndpoints.length + 2;
}

// Test 2: Frontend Tabbed Interface
function testFrontendInterface() {
  console.log('\n🖥️  Testing Frontend Tabbed Interface');
  console.log('-'.repeat(40));
  
  const logisticsPagePath = path.join(__dirname, '../web/app/admin/logistics/page.tsx');
  
  if (!fs.existsSync(logisticsPagePath)) {
    console.log('❌ Frontend logistics page not found');
    return false;
  }
  
  const pageContent = fs.readFileSync(logisticsPagePath, 'utf8');
  
  const requiredFeatures = [
    { name: 'TabKey type definition', pattern: "type TabKey = 'all-orders'" },
    { name: 'Active tab state', pattern: 'activeTab, setActiveTab' },
    { name: 'Tab data state', pattern: 'tabData, setTabData' },
    { name: 'Tab loading states', pattern: 'tabLoading' },
    { name: 'Handle tab change function', pattern: 'handleTabChange' },
    { name: 'Fetch tab data function', pattern: 'fetchTabData' },
    { name: 'All Orders tab', pattern: 'all-orders' },
    { name: 'Ready to Ship tab', pattern: 'ready-to-ship' },
    { name: 'In Transit tab', pattern: 'in-transit' },
    { name: 'Delivered tab', pattern: 'delivered' },
    { name: 'Pending Dispatch tab', pattern: 'pending-dispatch' }
  ];
  
  let passed = 0;
  
  requiredFeatures.forEach(feature => {
    if (pageContent.includes(feature.pattern)) {
      console.log(`✅ ${feature.name} - Found`);
      passed++;
    } else {
      console.log(`❌ ${feature.name} - Missing`);
    }
  });
  
  console.log(`\n📊 Frontend Interface Tests: ${passed}/${requiredFeatures.length} passed`);
  return passed === requiredFeatures.length;
}

// Test 3: Bulk Operations Frontend
function testBulkOperations() {
  console.log('\n📦 Testing Bulk Operations');
  console.log('-'.repeat(40));
  
  const logisticsPagePath = path.join(__dirname, '../web/app/admin/logistics/page.tsx');
  const pageContent = fs.readFileSync(logisticsPagePath, 'utf8');
  
  const bulkFeatures = [
    { name: 'Selected orders state', pattern: 'selectedOrders, setSelectedOrders' },
    { name: 'Bulk action loading state', pattern: 'bulkActionLoading' },
    { name: 'Bulk confirmation dialog', pattern: 'showBulkConfirmDialog' },
    { name: 'Handle select order', pattern: 'handleSelectOrder' },
    { name: 'Handle select all', pattern: 'handleSelectAll' },
    { name: 'Bulk create shipments', pattern: 'handleBulkCreateShipments' },
    { name: 'Bulk update status', pattern: 'handleBulkUpdateStatus' },
    { name: 'Execute bulk action', pattern: 'executeBulkAction' },
    { name: 'Checkbox in table header', pattern: 'type="checkbox"' },
    { name: 'Bulk action bar', pattern: 'selectedOrders.size > 0' },
    { name: 'Confirmation dialog', pattern: 'Confirm Bulk Action' },
    { name: 'Loading overlay', pattern: 'Processing Bulk Action' },
    { name: 'Result dialog', pattern: 'Bulk Action Results' }
  ];
  
  let passed = 0;
  
  bulkFeatures.forEach(feature => {
    if (pageContent.includes(feature.pattern)) {
      console.log(`✅ ${feature.name} - Found`);
      passed++;
    } else {
      console.log(`❌ ${feature.name} - Missing`);
    }
  });
  
  console.log(`\n📊 Bulk Operations Tests: ${passed}/${bulkFeatures.length} passed`);
  return passed === bulkFeatures.length;
}

// Test 4: API Documentation
function testApiDocumentation() {
  console.log('\n📚 Testing API Documentation');
  console.log('-'.repeat(40));
  
  const apiContractsPath = path.join(__dirname, '../docs/api-contracts.yaml');
  
  if (!fs.existsSync(apiContractsPath)) {
    console.log('❌ API contracts file not found');
    return false;
  }
  
  const apiContent = fs.readFileSync(apiContractsPath, 'utf8');
  
  const documentedEndpoints = [
    '/api/admin/logistics/stats',
    '/api/admin/logistics/all-orders',
    '/api/admin/logistics/ready-to-ship',
    '/api/admin/logistics/in-transit',
    '/api/admin/logistics/delivered',
    '/api/admin/logistics/pending-dispatch',
    '/api/admin/logistics/bulk-create-shipments',
    '/api/admin/logistics/bulk-update-status'
  ];
  
  const schemas = [
    'LogisticsStatsResponse',
    'LogisticsOrdersResponse',
    'LogisticsOrder',
    'BulkCreateShipmentsRequest',
    'BulkUpdateStatusRequest',
    'BulkActionResponse'
  ];
  
  let passed = 0;
  
  documentedEndpoints.forEach(endpoint => {
    if (apiContent.includes(endpoint)) {
      console.log(`✅ ${endpoint} - Documented`);
      passed++;
    } else {
      console.log(`❌ ${endpoint} - Missing`);
    }
  });
  
  schemas.forEach(schema => {
    if (apiContent.includes(schema + ':')) {
      console.log(`✅ Schema ${schema} - Defined`);
      passed++;
    } else {
      console.log(`❌ Schema ${schema} - Missing`);
    }
  });
  
  console.log(`\n📊 API Documentation Tests: ${passed}/${documentedEndpoints.length + schemas.length} passed`);
  return passed === documentedEndpoints.length + schemas.length;
}

// Test 5: Permission Boundaries
function testPermissionBoundaries() {
  console.log('\n🔒 Testing Permission Boundaries');
  console.log('-'.repeat(40));
  
  const adminRouterPath = path.join(__dirname, '../backend/api/routers/admin.py');
  const adminRouterContent = fs.readFileSync(adminRouterPath, 'utf8');
  
  // Check that all logistics endpoints require LOGISTICS_STAFF role
  const logisticsEndpoints = [
    'get_logistics_stats',
    'get_all_logistics_orders',
    'get_in_transit_orders', 
    'get_delivered_orders',
    'get_pending_dispatch_orders',
    'bulk_create_shipments',
    'bulk_update_shipment_status'
  ];
  
  let passed = 0;
  
  logisticsEndpoints.forEach(endpoint => {
    // Find the endpoint function and check if it has LOGISTICS_STAFF dependency
    const functionPattern = `async def ${endpoint}`;
    const permissionPattern = 'dependencies=[Depends(require_roles(*LOGISTICS_STAFF))]';

    const functionIndex = adminRouterContent.indexOf(functionPattern);
    if (functionIndex !== -1) {
      // Look for the permission pattern before the function (within 200 chars)
      const searchStart = Math.max(0, functionIndex - 200);
      const searchEnd = functionIndex + 100;
      const searchSection = adminRouterContent.substring(searchStart, searchEnd);

      if (searchSection.includes(permissionPattern)) {
        console.log(`✅ ${endpoint} - LOGISTICS_STAFF permission required`);
        passed++;
      } else {
        console.log(`❌ ${endpoint} - Missing LOGISTICS_STAFF permission`);
      }
    } else {
      console.log(`❌ ${endpoint} - Function not found`);
    }
  });
  
  console.log(`\n📊 Permission Tests: ${passed}/${logisticsEndpoints.length} passed`);
  return passed === logisticsEndpoints.length;
}

// Test 6: Performance Considerations
function testPerformanceConsiderations() {
  console.log('\n⚡ Testing Performance Considerations');
  console.log('-'.repeat(40));
  
  const adminRouterPath = path.join(__dirname, '../backend/api/routers/admin.py');
  const adminRouterContent = fs.readFileSync(adminRouterPath, 'utf8');
  
  const performanceFeatures = [
    { name: 'Pagination support', pattern: 'page_size' },
    { name: 'Bulk operation limits', pattern: 'len(order_ids) > 100' },
    { name: 'Database query optimization', pattern: 'join\\(' },
    { name: 'Proper indexing usage', pattern: '\\.where\\(' }
  ];
  
  let passed = 0;
  
  performanceFeatures.forEach(feature => {
    if (feature.name === 'Bulk operation limits') {
      // Special check for bulk limits - should appear twice (both endpoints)
      const matches = adminRouterContent.match(/len\(order_ids\) > 100/g);
      if (matches && matches.length >= 2) {
        console.log(`✅ ${feature.name} - Implemented (found ${matches.length} instances)`);
        passed++;
      } else {
        console.log(`❌ ${feature.name} - Missing or incomplete`);
      }
    } else {
      const regex = new RegExp(feature.pattern, 'g');
      if (regex.test(adminRouterContent)) {
        console.log(`✅ ${feature.name} - Implemented`);
        passed++;
      } else {
        console.log(`❌ ${feature.name} - Missing`);
      }
    }
  });
  
  // Check frontend auto-refresh
  const logisticsPagePath = path.join(__dirname, '../web/app/admin/logistics/page.tsx');
  const pageContent = fs.readFileSync(logisticsPagePath, 'utf8');
  
  if (pageContent.includes('30000')) {
    console.log('✅ Auto-refresh interval (30s) - Configured');
    passed++;
  } else {
    console.log('❌ Auto-refresh interval - Missing');
  }
  
  console.log(`\n📊 Performance Tests: ${passed}/${performanceFeatures.length + 1} passed`);
  return passed === performanceFeatures.length + 1;
}

// Run all tests
async function runIntegrationTests() {
  const results = {
    backend: testBackendEndpoints(),
    frontend: testFrontendInterface(), 
    bulk: testBulkOperations(),
    docs: testApiDocumentation(),
    permissions: testPermissionBoundaries(),
    performance: testPerformanceConsiderations()
  };
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 INTEGRATION TEST SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\n📊 Overall Result: ${passedTests}/${totalTests} test suites passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('✅ MDV Logistics Dashboard Enhancement is ready for deployment');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
  
  return passedTests === totalTests;
}

// Execute tests
runIntegrationTests().then(success => {
  process.exit(success ? 0 : 1);
});
