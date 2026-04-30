-- =============================================
-- CORRECCIÓN DE DATOS HISTÓRICOS
-- Tabla: historico_cobranza
-- Problema: Los montos monto_pendiente_total y monto_N_recibo
-- se guardaron en Bolivares (Bs.) en lugar de USD
-- Solución: Dividir por tasa_cambio para obtener el valor correcto en USD
-- =============================================

-- Primero, veamos el estado actual de los datos
SELECT
  edificio_id,
  fecha,
  monto_pendiente_total as "Monto Total (actual - probable en Bs.)",
  tasa_cambio as "Tasa BCV",
  monto_pendiente_total / NULLIF(tasa_cambio, 0) as "Monto Total Corregido (USD)",
  monto_1_recibo as "Monto 1 Recibo",
  monto_2_recibo as "Monto 2 Recibo",
  monto_3_recibo as "Monto 3 Recibo"
FROM historico_cobranza
WHERE tasa_cambio > 0
ORDER BY edificio_id, fecha DESC
LIMIT 20;

-- =============================================
-- APLICAR CORRECCIÓN
-- =============================================

-- Crear un backup de los valores originales antes de corregir
-- (Opcional - descomenta si necesitas mantener el historial)
-- UPDATE historico_cobranza
-- SET
--   monto_pendiente_total_original = monto_pendiente_total,
--   monto_1_recibo_original = monto_1_recibo,
--   monto_2_recibo_original = monto_2_recibo,
--   monto_3_recibo_original = monto_3_recibo,
--   monto_4_recibo_original = monto_4_recibo,
--   monto_5_recibo_original = monto_5_recibo,
--   monto_6_recibo_original = monto_6_recibo,
--   monto_7_recibo_original = monto_7_recibo,
--   monto_8_recibo_original = monto_8_recibo,
--   monto_9_recibo_original = monto_9_recibo,
--   monto_10_recibo_original = monto_10_recibo,
--   monto_11_recibo_original = monto_11_recibo,
--   monto_12_mas_recibo_original = monto_12_mas_recibo
-- WHERE monto_pendiente_total_original IS NULL;

-- Aplicar la corrección: convertir de Bs. a USD dividiendo por tasa_cambio
UPDATE historico_cobranza
SET
  monto_pendiente_total = ROUND(monto_pendiente_total / NULLIF(tasa_cambio, 0), 2),
  monto_1_recibo = ROUND(monto_1_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_2_recibo = ROUND(monto_2_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_3_recibo = ROUND(monto_3_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_4_recibo = ROUND(monto_4_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_5_recibo = ROUND(monto_5_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_6_recibo = ROUND(monto_6_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_7_recibo = ROUND(monto_7_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_8_recibo = ROUND(monto_8_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_9_recibo = ROUND(monto_9_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_10_recibo = ROUND(monto_10_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_11_recibo = ROUND(monto_11_recibo / NULLIF(tasa_cambio, 0), 2),
  monto_12_mas_recibo = ROUND(monto_12_mas_recibo / NULLIF(tasa_cambio, 0), 2)
WHERE tasa_cambio > 0;

-- Verificar la corrección
SELECT
  edificio_id,
  fecha,
  monto_pendiente_total as "Monto Total Corregido (USD)",
  monto_1_recibo as "Monto 1 Recibo (USD)",
  monto_2_recibo as "Monto 2 Recibo (USD)",
  monto_3_recibo as "Monto 3 Recibo (USD)"
FROM historico_cobranza
ORDER BY edificio_id, fecha DESC
LIMIT 10;
