-- SCRIPT DE CORRECCIÓN PARA EDIFISAAS - 2026-05-06
-- Mejoras en visibilidad y automatización

-- 1. Asegurar que la tabla de alertas tenga fecha por defecto para evitar errores en frontend
ALTER TABLE alertas ALTER COLUMN fecha SET DEFAULT CURRENT_DATE;

-- 2. Asegurar que la tabla alertas_log (usada para sistema) también sea robusta
ALTER TABLE alertas_log ALTER COLUMN leida SET DEFAULT false;

-- 3. Limpiar deudores fantasmas de meses previos si la unidad ya no tiene deuda en el mes actual
-- Este script puede ejecutarse periódicamente si se detectan inconsistencias
-- DELETE FROM recibos WHERE edificio_id = 'tu-uuid-aqui' AND unidad NOT IN (SELECT unidad FROM recibos WHERE mes = '2026-05');
