#!/usr/bin/env python3
"""
Fix the database migration issue by updating the alembic_version table
"""

import os
import sys
import subprocess

def get_database_url():
    """Get the database URL from Railway"""
    try:
        # Get DATABASE_URL from mdv-api service (which has the full URL)
        result = subprocess.run(
            ["railway", "variables", "--service", "mdv-api"],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Parse the output to find DATABASE_URL
        for line in result.stdout.split('\n'):
            if 'DATABASE_URL' in line and 'postgresql://' in line:
                # Extract the URL from the table format
                parts = line.split('│')
                if len(parts) >= 2:
                    url = parts[1].strip()
                    if url.startswith('postgresql://'):
                        return url
        
        print("❌ Could not find DATABASE_URL in Railway variables")
        print("Please set the DATABASE_URL environment variable manually:")
        print("  export DATABASE_URL='your-database-url'")
        return None
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error getting Railway variables: {e}")
        return None

def fix_migration():
    """Fix the migration issue in the database"""
    
    # Try to get database URL
    db_url = get_database_url()
    if not db_url:
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            print("❌ DATABASE_URL not found. Please set it as an environment variable.")
            sys.exit(1)
    
    # Mask the password in output
    masked_url = db_url[:30] + "..." if len(db_url) > 30 else db_url
    print(f"✅ Found database URL: {masked_url}")
    
    try:
        import psycopg2
    except ImportError:
        print("❌ psycopg2 not installed. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary"], check=True)
        import psycopg2
    
    print("\n📊 Connecting to database...")
    
    try:
        # Connect to the database
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Check current migration state
        print("\n🔍 Checking current migration state...")
        cursor.execute("SELECT version_num FROM alembic_version")
        result = cursor.fetchone()
        
        if result:
            current_version = result[0]
            print(f"   Current version: {current_version}")
            
            if current_version == 'add_category_cloudinary':
                print("\n⚠️  Found invalid migration reference 'add_category_cloudinary'")
                print("🔧 Fixing migration reference...")
                
                # Update to the correct version
                cursor.execute("UPDATE alembic_version SET version_num = 'c2d8e9f3a1b5' WHERE version_num = 'add_category_cloudinary'")
                conn.commit()
                
                # Verify the update
                cursor.execute("SELECT version_num FROM alembic_version")
                new_version = cursor.fetchone()[0]
                print(f"✅ Migration reference updated to: {new_version}")
                
            elif current_version == 'c2d8e9f3a1b5':
                print("✅ Migration reference is already correct (c2d8e9f3a1b5)")
                
            else:
                print(f"⚠️  Unexpected version found: {current_version}")
                print("   The latest migration should be 'c2d8e9f3a1b5'")
                response = input("   Do you want to update it? (y/n): ")
                if response.lower() == 'y':
                    cursor.execute("UPDATE alembic_version SET version_num = 'c2d8e9f3a1b5'")
                    conn.commit()
                    print("✅ Migration reference updated to: c2d8e9f3a1b5")
        else:
            print("⚠️  No migration version found in database")
            print("🔧 Initializing migration state...")
            cursor.execute("INSERT INTO alembic_version (version_num) VALUES ('c2d8e9f3a1b5')")
            conn.commit()
            print("✅ Migration state initialized with version: c2d8e9f3a1b5")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Database migration fix completed successfully!")
        print("\n📝 Next steps:")
        print("   1. Restart the mdv-api service to apply migrations:")
        print("      railway restart mdv-api")
        print("   2. Check the logs to verify migrations run successfully:")
        print("      railway logs --service mdv-api")
        
    except Exception as e:
        print(f"\n❌ Error fixing migration: {e}")
        print("\nTroubleshooting:")
        print("  1. Make sure you're connected to Railway")
        print("  2. Check that the database service is running")
        print("  3. Verify your DATABASE_URL is correct")
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 50)
    print("MDV Database Migration Fix")
    print("=" * 50)
    fix_migration()
