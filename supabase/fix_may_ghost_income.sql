-- SCRIPT PARA CORREGIR INGRESOS FANTASMA DE MAYO 2026
-- Estos ingresos ocurrieron por una detección automática durante el cambio de mes
-- Movemos los pagos registrados el 4 de mayo (o fechas recientes de mayo) al 30 de abril.

-- 1. Actualizar pagos_recibos
UPDATE pagos_recibos 
SET fecha_pago = '2026-04-30',
    mes = '2026-04'
WHERE (fecha_pago = '2026-05-04' OR fecha_pago = '2026-05-02')
AND source IN ('deteccion_automatica', 'deteccion_parcial');

-- 2. Actualizar movimientos generales
UPDATE movimientos 
SET fecha = '2026-04-30' 
WHERE (fecha = '2026-05-04' OR fecha = '2026-05-02')
AND tipo = 'ingreso'
AND descripcion LIKE '%DETECTADO%';

-- 3. Limpiar movimientos_dia (Vista del Dashboard)
-- Al borrarlos de aquí, dejarán de sumar en el total de "Ingresos del Mes" del dashboard actual
DELETE FROM movimientos_dia 
WHERE (detectado_en = '2026-05-04' OR detectado_en = '2026-05-02')
AND tipo = 'recibo';

-- 4. Actualizar alertas (Opcional, para coherencia histórica)
UPDATE alertas 
SET fecha = '2026-04-30' 
WHERE (fecha = '2026-05-04' OR fecha = '2026-05-02')
AND tipo = 'ingreso';

-- 5. Eliminar balances erróneos de Mayo si existen y tienen el monto fantasma
-- Esto obligará al sistema a recalcular o mostrar 0 hasta el próximo sync válido
DELETE FROM balances
WHERE mes = '2026-05'
AND cobranza_mes > 700000;
