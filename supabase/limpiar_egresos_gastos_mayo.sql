-- SQL Script to clean up incorrect May 2nd expenditures and expenses
-- These were historical records incorrectly assigned to today's date.

-- 1. Remove from egresos table
DELETE FROM egresos 
WHERE fecha = '2026-05-02' 
AND sincronizado = true;

-- 2. Remove from gastos table
DELETE FROM gastos 
WHERE fecha = '2026-05-02';

-- 3. Remove from movimientos (general history)
DELETE FROM movimientos 
WHERE fecha = '2026-05-02' 
AND (tipo = 'egreso' OR tipo = 'gasto');

-- 4. Remove from movimientos_dia (Daily Dashboard view)
DELETE FROM movimientos_dia 
WHERE detectado_en = '2026-05-02' 
AND (tipo = 'egreso' OR tipo = 'gasto');
