-- Agregar campos de URLs a edificios (ejecutar en Supabase SQL Editor)

ALTER TABLE edificios 
ADD COLUMN IF NOT EXISTS admin_nombre VARCHAR(100) DEFAULT 'La Ideal C.A.',
ADD COLUMN IF NOT EXISTS url_login TEXT,
ADD COLUMN IF NOT EXISTS url_recibos TEXT,
ADD COLUMN IF NOT EXISTS url_egresos TEXT,
ADD COLUMN IF NOT EXISTS url_gastos TEXT,
ADD COLUMN IF NOT EXISTS url_balance TEXT,
ADD COLUMN IF NOT EXISTS ultima_sincronizacion TIMESTAMP WITH TIME ZONE;

-- Agregar datos por defecto para La Ideal C.A.
UPDATE edificios 
SET 
  url_login = 'https://admlaideal.com.ve/control.php',
  url_recibos = 'https://admlaideal.com.ve/condlin.php?r=5',
  url_egresos = 'https://admlaideal.com.ve/condlin.php?r=21',
  url_gastos = 'https://admlaideal.com.ve/condlin.php?r=3',
  url_balance = 'https://admlaideal.com.ve/condlin.php?r=2'
WHERE admin_nombre = 'La Ideal C.A.' 
AND (url_login IS NULL OR url_login = '');