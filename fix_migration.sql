-- Check current migration state
SELECT version_num FROM alembic_version;

-- If the version_num shows 'add_category_cloudinary', update it:
-- This will set it to the last valid migration before the problematic one
UPDATE alembic_version 
SET version_num = 'c2d8e9f3a1b5' 
WHERE version_num = 'add_category_cloudinary';

-- If no rows exist in alembic_version, insert the current head
INSERT INTO alembic_version (version_num) 
SELECT 'c2d8e9f3a1b5'
WHERE NOT EXISTS (SELECT 1 FROM alembic_version);

-- Verify the change
SELECT version_num FROM alembic_version;
