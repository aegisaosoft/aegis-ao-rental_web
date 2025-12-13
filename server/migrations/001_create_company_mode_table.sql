-- Create company_mode table
CREATE TABLE IF NOT EXISTS company_mode (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    is_rental BOOLEAN NOT NULL DEFAULT true,
    is_violations BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_mode_company_id ON company_mode(company_id);

-- Add foreign key constraint if companies table exists (optional, uncomment if needed)
-- ALTER TABLE company_mode ADD CONSTRAINT fk_company_mode_company 
--     FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
