-- Table28 data: average house prices by new/other dwellings and buyer type (First time vs Former owner).
CREATE TABLE IF NOT EXISTS housing_sales_by_buyer_dwelling (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES buyer_dwelling_categories(id),
    period DATE NOT NULL,
    avg_price DECIMAL(15, 2),
    UNIQUE (region_id, category_id, period)
);
