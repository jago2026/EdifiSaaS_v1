-- SCRIPT DE LIMPIEZA PROFUNDA (02/05/2026)
-- Este script limpia los duplicados generados por sincronizaciones fallidas de hoy
-- y resetea los registros mal fechados para que se carguen correctamente con el nuevo fix.

-- 1. Limpiar tabla de vista diaria (Dashboard) para resetear hoy
DELETE FROM movimientos_dia WHERE detectado_en = '2026-05-02';

-- 2. Limpiar gastos e egresos mal fechados (puestos hoy pero que son de abril)
DELETE FROM egresos WHERE fecha = '2026-05-02' AND sincronizado = true;
DELETE FROM gastos WHERE fecha = '2026-05-02' AND sincronizado = true;

-- 3. Limpiar historial general de movimientos mal fechados
DELETE FROM movimientos 
WHERE fecha = '2026-05-02' 
AND (tipo = 'egreso' OR tipo = 'gasto');

-- 4. Opcional: Si quieres limpiar también los recibos detectados hoy para re-sincronizar todo limpio
-- DELETE FROM pagos_recibos WHERE fecha_deteccion::date = '2026-05-02';
