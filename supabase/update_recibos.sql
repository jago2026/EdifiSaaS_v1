-- Script para actualizar la tabla de recibos
ALTER TABLE recibos ADD COLUMN IF NOT EXISTS mes VARCHAR(7);
ALTER TABLE recibos ADD COLUMN IF NOT EXISTS actualizado_en DATE;

-- Opcional: Crear un índice para mejorar la velocidad de las consultas por mes
CREATE INDEX IF NOT EXISTS idx_recibos_mes ON recibos(edificio_id, mes);
