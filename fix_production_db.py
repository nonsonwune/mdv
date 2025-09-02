#!/usr/bin/env python3
"""
CRITICAL PRODUCTION FIX: Add missing force_password_change column
This script connects to the production database and adds the missing column
that's causing login failures.
"""

import psycopg2
import sys

# Production database connection string
DATABASE_URL = "postgresql://postgres:JTITwnMYUWxDvpedixscWLBOUAUejFxM@caboose.proxy.rlwy.net:27635/railway"

def main():
    print("🚨 CRITICAL PRODUCTION FIX: Adding missing force_password_change column")
    print("=" * 70)
    
    try:
        # Connect to the database
        print("1. Connecting to production database...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        
        # Check if column already exists
        print("\n2. Checking if column already exists...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'force_password_change'
        """)
        
        existing_column = cursor.fetchone()
        
        if existing_column:
            print("✅ Column 'force_password_change' already exists!")
            print("The database schema is correct. The issue might be elsewhere.")
        else:
            print("❌ Column 'force_password_change' does NOT exist - this is the problem!")
            
            # Add the missing column
            print("\n3. Adding the missing column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE
            """)
            
            # Commit the change
            conn.commit()
            print("✅ Column added successfully!")
            
            # Verify the column was added
            print("\n4. Verifying the column was added...")
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'force_password_change'
            """)
            
            result = cursor.fetchone()
            if result:
                print(f"✅ Verification successful!")
                print(f"   Column: {result[0]}")
                print(f"   Type: {result[1]}")
                print(f"   Nullable: {result[2]}")
                print(f"   Default: {result[3]}")
            else:
                print("❌ Verification failed - column not found after creation!")
                return False
        
        # Test that we can query the column
        print("\n5. Testing column access...")
        cursor.execute("SELECT COUNT(*) FROM users WHERE force_password_change IS NOT NULL")
        count = cursor.fetchone()[0]
        print(f"✅ Successfully queried column - found {count} users")
        
        # Show current table structure
        print("\n6. Current users table structure:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        for col in columns:
            print(f"   {col[0]:<20} | {col[1]:<15} | {col[2]:<8} | {col[3] or 'NULL'}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 70)
        print("🎉 PRODUCTION FIX COMPLETED SUCCESSFULLY!")
        print("🔄 The login issue should now be resolved.")
        print("📝 Next steps:")
        print("   1. Test login at: https://mdv-web-production.up.railway.app")
        print("   2. Monitor application logs for any remaining errors")
        print("   3. Verify admin user management features work")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
