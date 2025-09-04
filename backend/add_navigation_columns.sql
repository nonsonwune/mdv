-- Add dynamic navigation fields to categories table
-- This script adds the new columns needed for dynamic navigation

-- Add show_in_navigation column
ALTER TABLE categories ADD COLUMN show_in_navigation BOOLEAN DEFAULT FALSE;

-- Add navigation_icon column
ALTER TABLE categories ADD COLUMN navigation_icon VARCHAR(50);

-- Add is_sale_category column
ALTER TABLE categories ADD COLUMN is_sale_category BOOLEAN DEFAULT FALSE;

-- Add auto_sale_threshold column
ALTER TABLE categories ADD COLUMN auto_sale_threshold INTEGER;

-- Add created_at column
ALTER TABLE categories ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at column
ALTER TABLE categories ADD COLUMN updated_at DATETIME;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS ix_categories_show_in_navigation ON categories(show_in_navigation);
CREATE INDEX IF NOT EXISTS ix_categories_is_sale_category ON categories(is_sale_category);
CREATE INDEX IF NOT EXISTS ix_categories_created_at ON categories(created_at);
