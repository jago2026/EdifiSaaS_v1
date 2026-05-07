-- Fix unique constraint on recibos_detalle to allow multiple items with same code but different description
-- This happens when codes like 00007 (Bono/Cestatickets) or 00101 (Electricity 1/2) are reused.

-- 1. Drop the existing constraint
ALTER TABLE recibos_detalle DROP CONSTRAINT IF EXISTS recibos_detalle_edificio_id_unidad_mes_codigo_key;

-- 2. Add a more specific unique constraint that includes description
-- This allows same code for different concepts, while still preventing exact duplicate rows.
ALTER TABLE recibos_detalle ADD CONSTRAINT recibos_detalle_edificio_id_unidad_mes_codigo_desc_key 
UNIQUE(edificio_id, unidad, mes, codigo, descripcion);

-- Also fix any potential duplicates in egresos and gastos if needed, 
-- but those already include description or operacion in their hash.

-- Verify and cleanup any existing duplicates that might hinder future syncs if the constraint was violated before
-- (Though the sync already deletes then inserts, it's good to have the schema right).
