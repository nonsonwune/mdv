#!/usr/bin/env python3
"""
Execute SQL file using the backend's database connection.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from mdv.db import session_scope

async def execute_sql_file(sql_file_path):
    """Execute SQL from file."""
    
    # Read SQL file
    with open(sql_file_path, 'r') as f:
        sql_content = f.read()
    
    print(f"🔄 Executing SQL from {sql_file_path}...")
    
    async with session_scope() as session:
        try:
            # Split SQL content by semicolon and execute each statement
            statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
            
            results = []
            for i, statement in enumerate(statements):
                if statement:
                    print(f"   Executing statement {i+1}/{len(statements)}...")
                    result = await session.execute(text(statement))
                    
                    # If it's a SELECT statement, fetch results
                    if statement.upper().strip().startswith('SELECT'):
                        rows = result.fetchall()
                        results.append(rows)
            
            print("✅ SQL execution completed successfully!")
            
            # Print results from SELECT statements
            if results:
                print("\n📊 Query results:")
                for rows in results:
                    for row in rows:
                        print(f"   {row[0]}: {row[1]}")
            
        except Exception as e:
            print(f"❌ Error during SQL execution: {e}")
            raise

async def main():
    if len(sys.argv) < 2:
        print("Usage: python execute_sql.py <sql_file_path>")
        sys.exit(1)
    
    sql_file = sys.argv[1]
    if not os.path.exists(sql_file):
        print(f"SQL file not found: {sql_file}")
        sys.exit(1)
    
    await execute_sql_file(sql_file)

if __name__ == "__main__":
    asyncio.run(main())
