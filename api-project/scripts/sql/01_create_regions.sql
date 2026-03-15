-- Base table for geographic regions (UK, ONS areas). Referenced by housing_sales_data,
-- housing_sales_by_buyer_dwelling, affordability_metrics, rental_metrics.
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gss_code VARCHAR(20) UNIQUE,
    implied_avg_borrower_income DECIMAL(15, 2),
    implied_income_year VARCHAR(10)
);
