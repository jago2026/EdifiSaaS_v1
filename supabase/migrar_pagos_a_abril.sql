-- SCRIPT PARA MIGRAR PAGOS DE MAYO A ABRIL Y EVITAR RE-DETECCIÓN
-- Ejecutar en Supabase SQL Editor

-- 1. Mover los pagos de hoy a la fecha real (30 de Abril)
UPDATE pagos_recibos 
SET fecha_pago = '2026-04-30' 
WHERE fecha_pago = '2026-05-02';

-- 2. Actualizar el historial general de movimientos a Abril
UPDATE movimientos 
SET fecha = '2026-04-30' 
WHERE fecha = '2026-05-02' 
AND tipo = 'ingreso';

-- 3. Limpiar la tabla de vista diaria (Dashboard)
-- Al borrarlos de aquí, ya no saldrán en el listado de "Movimientos de Hoy"
DELETE FROM movimientos_dia 
WHERE detectado_en = '2026-05-02' 
AND tipo = 'recibo';

-- 4. (Opcional) Mover alertas a abril
UPDATE alertas 
SET fecha = '2026-04-30' 
WHERE fecha = '2026-05-02' 
AND tipo = 'ingreso';
