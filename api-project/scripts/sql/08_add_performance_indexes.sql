-- Phase 4: Database performance optimization.
-- Indexes on columns frequently used for filtering and ordering in API queries.
-- Idempotent: IF NOT EXISTS so safe to run on existing databases.

-- housing_sales_data: filtered by region_id, period (range), property_type_id. Ordered by period DESC.
CREATE INDEX IF NOT EXISTS idx_housing_sales_data_region_period
  ON housing_sales_data (region_id, period DESC);

CREATE INDEX IF NOT EXISTS idx_housing_sales_data_property_type
  ON housing_sales_data (property_type_id);

CREATE INDEX IF NOT EXISTS idx_housing_sales_data_region_property_period
  ON housing_sales_data (region_id, property_type_id, period DESC);

-- housing_sales_by_buyer_dwelling: filtered by region_id, period (range), category_id. Ordered by period DESC.
CREATE INDEX IF NOT EXISTS idx_housing_sales_by_buyer_region_period
  ON housing_sales_by_buyer_dwelling (region_id, period DESC);

CREATE INDEX IF NOT EXISTS idx_housing_sales_by_buyer_category
  ON housing_sales_by_buyer_dwelling (category_id);

CREATE INDEX IF NOT EXISTS idx_housing_sales_by_buyer_region_category_period
  ON housing_sales_by_buyer_dwelling (region_id, category_id, period DESC);

-- affordability_metrics: filtered by region_id, period (range), category_id. Ordered by period DESC.
CREATE INDEX IF NOT EXISTS idx_affordability_metrics_region_period
  ON affordability_metrics (region_id, period DESC);

CREATE INDEX IF NOT EXISTS idx_affordability_metrics_category
  ON affordability_metrics (category_id);

CREATE INDEX IF NOT EXISTS idx_affordability_metrics_region_category_period
  ON affordability_metrics (region_id, category_id, period DESC);

-- rental_metrics: filtered by region_id, period (range). Ordered by period DESC.
-- UNIQUE(region_id, period) already creates an index. This one supports region_id + period lookups.
CREATE INDEX IF NOT EXISTS idx_rental_metrics_region_period
  ON rental_metrics (region_id, period DESC);
