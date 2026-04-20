-- Migration to add cron configuration columns to edificios table
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS cron_enabled BOOLEAN DEFAULT true;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS cron_time TIME DEFAULT '05:00';
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS cron_frequency VARCHAR(50) DEFAULT 'diaria';

-- Optional: Update existing records to have these defaults
UPDATE edificios SET cron_enabled = true WHERE cron_enabled IS NULL;
UPDATE edificios SET cron_time = '05:00' WHERE cron_time IS NULL;
UPDATE edificios SET cron_frequency = 'diaria' WHERE cron_frequency IS NULL;
