-- SQL Script to remove duplicate payments in EdifiSaaS
-- This script identifies duplicates in the pagos_recibos table based on:
-- edificio_id, unidad, mes, monto, and fecha_pago.
-- It keeps only the record with the oldest fecha_deteccion (the first one detected).

WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY edificio_id, unidad, mes, monto, fecha_pago
               ORDER BY fecha_deteccion ASC
           ) as row_num
    FROM pagos_recibos
)
DELETE FROM pagos_recibos
WHERE id IN (
    SELECT id 
    FROM duplicates 
    WHERE row_num > 1
);
