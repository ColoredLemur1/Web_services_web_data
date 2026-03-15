-- Rent data from rent.csv: core and granular rental metrics per region and period.
CREATE TABLE IF NOT EXISTS rental_metrics (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    period DATE NOT NULL,
    rental_price_all DECIMAL(15, 2),
    annual_change_pct DECIMAL(5, 2),
    rental_price_one_bed DECIMAL(15, 2),
    rental_price_four_plus_bed DECIMAL(15, 2),
    rental_price_detached DECIMAL(15, 2),
    rental_price_terraced DECIMAL(15, 2),
    rental_price_flat_maisonette DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (region_id, period)
);
