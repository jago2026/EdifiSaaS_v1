-- SQL Script to clean up incorrect May 2nd expenditures, expenses and payments
-- These were historical records incorrectly assigned to today's date.

-- 1. Remove from egresos table
DELETE FROM egresos 
WHERE fecha = '2026-05-02' 
AND sincronizado = true;

-- 2. Remove from gastos table
DELETE FROM gastos 
WHERE fecha = '2026-05-02';

-- 3. Remove from pagos_recibos (if any were wrongly dated today)
-- Note: User mentioned payments CAN have today's date if detected today, 
-- but if you want to clean specific ones, use this:
-- DELETE FROM pagos_recibos WHERE fecha_pago = '2026-05-02';

-- 4. Remove from ingresos table (if any)
DELETE FROM ingresos
WHERE fecha = '2026-05-02';

-- 5. Remove from movimientos (general history)
DELETE FROM movimientos 
WHERE fecha = '2026-05-02' 
AND (tipo = 'egreso' OR tipo = 'gasto' OR tipo = 'ingreso');

-- 6. Remove from movimientos_dia (Daily Dashboard view)
DELETE FROM movimientos_dia 
WHERE detectado_en = '2026-05-02';
