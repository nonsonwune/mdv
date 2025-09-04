# Railway PostgreSQL Database Reset Guide

## Overview

This guide provides step-by-step instructions for safely resetting the Railway PostgreSQL database for the MDV e-commerce platform to a clean state while preserving only the admin user.

## 🚨 **CRITICAL SAFETY WARNINGS**

- ⚠️ **This affects the PRODUCTION database on Railway**
- ⚠️ **This action is IRREVERSIBLE**
- ⚠️ **ALL data will be deleted except admin@mdv.ng**
- ⚠️ **Always run with --dry-run first to verify**

## 📋 **Prerequisites**

### 1. Install Required Dependencies
```bash
cd backend
pip install -r railway_requirements.txt
```

### 2. Verify Railway Connection Details
The script uses these Railway PostgreSQL connection URLs:
- **Public URL**: `postgresql://postgres:JTITwnMYUWxDvpedixscWLBOUAUejFxM@caboose.proxy.rlwy.net:27635/railway`
- **Internal URL**: `postgresql://postgres:JTITwnMYUWxDvpedixscWLBOUAUejFxM@postgres.railway.internal:5432/railway`

## 🔍 **Step 1: Dry Run (ALWAYS DO THIS FIRST)**

Before performing any actual reset, run a dry run to see what would be deleted:

```bash
python railway_reset.py --dry-run
```

**Expected Output:**
```
🚨 RAILWAY POSTGRESQL DATABASE RESET
============================================================
⚠️  WARNING: This will delete ALL data except admin@mdv.ng!
⚠️  This action affects the PRODUCTION database!
⚠️  This action is IRREVERSIBLE!
============================================================
🔍 DRY RUN MODE: No actual changes will be made
============================================================

🔌 Connecting to Railway PostgreSQL database...
✅ Connected successfully!
  PostgreSQL Version: PostgreSQL 15.x

📊 Getting current table record counts...
  categories: 5 records
  products: 12 records
  variants: 24 records
  orders: 8 records
  users: 3 records

✅ Found admin user: Admin User (admin@mdv.ng)

🗑️  Starting data deletion process...
🔍 DRY RUN MODE - No actual deletions will be performed
  [DRY RUN] Would delete 0 records from fulfillment_items
  [DRY RUN] Would delete 0 records from fulfillments
  [DRY RUN] Would delete 8 records from order_items
  [DRY RUN] Would delete 8 records from orders
  [DRY RUN] Would delete 24 records from variants
  [DRY RUN] Would delete 12 records from products
  [DRY RUN] Would delete 5 records from categories

👥 Handling user accounts...
  [DRY RUN] Would delete 2 user accounts (preserving admin)

🔄 Resetting auto-increment sequences...
  [DRY RUN] Would reset all sequence counters

============================================================
🔍 DRY RUN COMPLETED SUCCESSFULLY!
============================================================
✅ Dry run shows reset would work correctly
✅ Admin user would be preserved
✅ All other data would be deleted
✅ Run without --dry-run to perform actual reset
============================================================
```

## 🚀 **Step 2: Perform Actual Reset**

Once you've verified the dry run looks correct, perform the actual reset:

```bash
python railway_reset.py
```

**Interactive Prompts:**
1. Type `PRODUCTION` to confirm this is for production database
2. Type `RESET` to confirm database reset

**Expected Output:**
```
🚨 RAILWAY POSTGRESQL DATABASE RESET
============================================================
⚠️  WARNING: This will delete ALL data except admin@mdv.ng!
⚠️  This action affects the PRODUCTION database!
⚠️  This action is IRREVERSIBLE!
============================================================
Type 'PRODUCTION' to confirm this is for production database: PRODUCTION
Type 'RESET' to confirm database reset: RESET

🔌 Connecting to Railway PostgreSQL database...
✅ Connected successfully!

📊 Current database state:
  categories: 5 records
  products: 12 records
  variants: 24 records
  orders: 8 records
  users: 3 records

✅ Found admin user: Admin User (admin@mdv.ng)

🗑️  Starting data deletion process...
  ✅ Deleted 8 records from order_items
  ✅ Deleted 8 records from orders
  ✅ Deleted 24 records from variants
  ✅ Deleted 12 records from products
  ✅ Deleted 5 records from categories

👥 Handling user accounts...
  ✅ Deleted 2 user accounts (preserved admin)

👤 Creating admin user...
  ✅ Admin user already exists

🔄 Resetting auto-increment sequences...
  ✅ Reset sequence: users_id_seq
  ✅ Reset sequence: products_id_seq
  ✅ Reset sequence: categories_id_seq
  ✅ Set admin user ID to 1

🔍 Verifying database reset...
✅ Admin user verified: ID=1, Role=admin
✅ products table is empty
✅ orders table is empty
✅ carts table is empty
✅ reviews table is empty
✅ categories table is empty
✅ Total users in database: 1 (should be 1)

============================================================
🎉 RAILWAY DATABASE RESET COMPLETED SUCCESSFULLY!
============================================================
✅ All data deleted except admin user
✅ Admin user preserved: admin@mdv.ng
✅ Admin password: admin
✅ Admin role: admin
✅ Sequences reset
✅ Database ready for fresh data
============================================================
```

## 🔧 **Advanced Usage Options**

### Skip Interactive Confirmation (Use with Extreme Caution)
```bash
python railway_reset.py --confirm
```

### Use Custom Database URL
```bash
python railway_reset.py --database-url "postgresql://user:pass@host:port/db"
```

### Combine Options
```bash
python railway_reset.py --dry-run --database-url "custom-url"
```

## 🔍 **Verification Steps**

After running the reset, verify the results:

### 1. Check Admin User Access
- Navigate to your Railway-deployed web application
- Go to `/staff-login`
- Login with: `admin@mdv.ng` / `admin`
- Verify you can access `/admin` dashboard
- Verify you can access `/admin/audit` (should show clean audit logs)

### 2. Check Database State
Connect to Railway database and verify:
```sql
-- Should return 1 (only admin user)
SELECT COUNT(*) FROM users;

-- Should return admin user details
SELECT id, name, email, role, active FROM users;

-- Should return 0 for all these tables
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM categories;
SELECT COUNT(*) FROM carts;
```

## 🛡️ **Safety Features**

### Built-in Safety Mechanisms:
1. **Multiple Confirmation Prompts**: Requires typing 'PRODUCTION' and 'RESET'
2. **Dry Run Mode**: Always test first with `--dry-run`
3. **Connection Testing**: Verifies database connection before operations
4. **Transaction Safety**: Uses PostgreSQL transactions with rollback on errors
5. **Admin Preservation**: Specifically preserves admin@mdv.ng user
6. **Foreign Key Handling**: Properly handles foreign key constraints
7. **Verification**: Automatically verifies reset completion

### Error Handling:
- Connection failures are handled gracefully
- Transaction rollback on any error
- Detailed error messages for troubleshooting
- Safe disconnection even on failures

## 🔄 **When to Use This Script**

### Recommended Use Cases:
1. **Testing Environment Setup**: Clean slate for testing new features
2. **Demo Preparation**: Reset to clean state for demonstrations
3. **Development Reset**: Clear test data between development cycles
4. **Deployment Preparation**: Clean database before production data import
5. **Emergency Recovery**: Reset to known good state after data corruption

### NOT Recommended For:
- ❌ Production databases with real customer data
- ❌ Databases without proper backups
- ❌ When you need to preserve any existing data
- ❌ Automated scripts without human oversight

## 📞 **Troubleshooting**

### Common Issues:

#### Connection Errors
```
❌ Could not connect to Railway database with any URL
```
**Solution**: Verify Railway database credentials and network connectivity

#### Permission Errors
```
❌ Error during data deletion: permission denied
```
**Solution**: Ensure the database user has sufficient privileges

#### Foreign Key Constraint Errors
```
❌ Error with table_name: foreign key constraint
```
**Solution**: The script handles this automatically, but if it persists, check for circular references

#### Admin User Not Found
```
❌ Admin user not found!
```
**Solution**: The script will create the admin user automatically

### Getting Help:
1. Run with `--dry-run` first to identify issues
2. Check Railway database logs for connection issues
3. Verify database credentials are current
4. Ensure network connectivity to Railway

## 🎯 **Post-Reset Checklist**

After successful reset:

- [ ] ✅ Admin user login works (admin@mdv.ng / admin)
- [ ] ✅ Admin dashboard accessible
- [ ] ✅ Audit logs page shows clean state
- [ ] ✅ All product tables are empty
- [ ] ✅ All order tables are empty
- [ ] ✅ All user tables contain only admin
- [ ] ✅ Database sequences reset to start from 1
- [ ] ✅ Ready to import fresh data or start testing

## 🔐 **Security Notes**

- The script preserves the admin user's password hash
- All other user accounts are completely removed
- Audit logs can optionally be preserved (uncomment in script)
- Database credentials are handled securely
- No sensitive data is logged or displayed

---

**Remember**: Always run `--dry-run` first and ensure you have proper backups before performing any production database reset!
