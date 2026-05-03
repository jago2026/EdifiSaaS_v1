-- Migration to add report type preference to edificios table
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS tipo_informe VARCHAR(50) DEFAULT 'estandar';

-- Update existing records to have 'estandar' as default
UPDATE edificios SET tipo_informe = 'estandar' WHERE tipo_informe IS NULL;
