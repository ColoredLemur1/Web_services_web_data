-- Table30 data: price/income and advance/income ratios for Affordability Index.
CREATE TABLE IF NOT EXISTS affordability_metrics (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES buyer_dwelling_categories(id),
    period DATE NOT NULL,
    advance_price_pct DECIMAL(10, 2),
    price_income_ratio DECIMAL(10, 2),
    advance_income_ratio DECIMAL(10, 2),
    UNIQUE (region_id, category_id, period)
);
