-- Lookup table for table28 (housing sales by buyer/dwelling) and table30 (affordability).
CREATE TABLE IF NOT EXISTS buyer_dwelling_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Seed the five categories used in table28 and table30.
INSERT INTO buyer_dwelling_categories (name) VALUES
    ('New dwellings'),
    ('Other dwellings'),
    ('All dwellings'),
    ('First time buyers'),
    ('Former owner occupiers')
ON CONFLICT (name) DO NOTHING;
