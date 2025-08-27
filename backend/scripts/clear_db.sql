-- Clear database while preserving users and system configuration
-- This script deletes all data except users, user_addresses, zones, state_zones, and coupons

-- Disable foreign key checks temporarily (if needed)
-- SET foreign_key_checks = 0;

-- Clear reviews and votes
DELETE FROM review_votes;
DELETE FROM reviews;

-- Clear wishlists
DELETE FROM wishlist_items;
DELETE FROM wishlists;

-- Clear returns and refunds
DELETE FROM return_items;
DELETE FROM returns;
DELETE FROM refunds;

-- Clear shipments and events
DELETE FROM shipment_events;
DELETE FROM shipments;

-- Clear fulfillments
DELETE FROM fulfillment_items;
DELETE FROM fulfillments;

-- Clear orders and related
DELETE FROM order_items;
DELETE FROM addresses;
DELETE FROM orders;

-- Clear reservations and cart items
DELETE FROM reservations;
DELETE FROM cart_items;
DELETE FROM carts;

-- Clear inventory and stock
DELETE FROM stock_ledger;
DELETE FROM inventory;

-- Clear product data
DELETE FROM product_images;
DELETE FROM variants;
DELETE FROM products;
DELETE FROM categories;

-- Clear audit logs
DELETE FROM audit_logs;

-- Show final counts
SELECT 
  'users' as table_name, 
  (SELECT COUNT(*) FROM users) as count
UNION ALL
SELECT 'products', (SELECT COUNT(*) FROM products)
UNION ALL  
SELECT 'orders', (SELECT COUNT(*) FROM orders)
UNION ALL
SELECT 'categories', (SELECT COUNT(*) FROM categories)
UNION ALL
SELECT 'carts', (SELECT COUNT(*) FROM carts)
UNION ALL
SELECT 'inventory', (SELECT COUNT(*) FROM inventory)
UNION ALL
SELECT 'user_addresses', (SELECT COUNT(*) FROM user_addresses)
UNION ALL
SELECT 'zones', (SELECT COUNT(*) FROM zones)
UNION ALL
SELECT 'state_zones', (SELECT COUNT(*) FROM state_zones)
UNION ALL
SELECT 'coupons', (SELECT COUNT(*) FROM coupons);
