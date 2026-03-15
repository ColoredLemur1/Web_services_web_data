-- Lookup table for UKHPI housing sales (All property types, Detached, etc.).
CREATE TABLE IF NOT EXISTS property_types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) UNIQUE NOT NULL
);
