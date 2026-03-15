-- UKHPI housing sales: average price, changes, volume, index by region, property type, period.
CREATE TABLE IF NOT EXISTS housing_sales_data (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    property_type_id INTEGER NOT NULL REFERENCES property_types(id),
    period DATE NOT NULL,
    avg_price DECIMAL(15, 2),
    annual_change_pct DECIMAL(10, 2),
    monthly_change_pct DECIMAL(10, 2),
    sales_volume INTEGER,
    house_price_index DECIMAL(15, 2),
    is_new_build BOOLEAN NOT NULL DEFAULT false
);
