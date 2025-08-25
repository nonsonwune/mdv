-- Product images schema proposal for PostgreSQL
-- Assumes an existing products table with primary key id (bigint or integer)

CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  width INT,
  height INT,
  sort_order INT DEFAULT 0 NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure at most one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_images_one_primary
  ON product_images (product_id)
  WHERE is_primary;

-- Common listing order
CREATE INDEX IF NOT EXISTS ix_product_images_product_sort
  ON product_images (product_id, sort_order);

-- Trigger to auto-update updated_at (if not using ORM-level timestamps)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_images_updated_at ON product_images;
CREATE TRIGGER trg_product_images_updated_at
BEFORE UPDATE ON product_images
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

