-- Script de Optimización de Base de Datos - EdifiSaaS v1
-- Agrega índices para mejorar el rendimiento de las consultas más frecuentes

-- Tabla egresos
CREATE INDEX IF NOT EXISTS idx_egresos_edificio_fecha ON egresos(edificio_id, fecha);
CREATE INDEX IF NOT EXISTS idx_egresos_edificio_mes ON egresos(edificio_id, mes);

-- Tabla gastos
CREATE INDEX IF NOT EXISTS idx_gastos_edificio_fecha ON gastos(edificio_id, fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_edificio_mes ON gastos(edificio_id, mes);

-- Tabla pagos_recibos
CREATE INDEX IF NOT EXISTS idx_pagos_recibos_edificio_fecha ON pagos_recibos(edificio_id, fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_recibos_edificio_mes ON pagos_recibos(edificio_id, mes);

-- Tabla movimientos_dia
CREATE INDEX IF NOT EXISTS idx_movimientos_dia_edificio_fecha ON movimientos_dia(edificio_id, detectado_en);

-- Tabla alertas
CREATE INDEX IF NOT EXISTS idx_alertas_edificio_created ON alertas(edificio_id, created_at DESC);

-- Tabla recibos
CREATE INDEX IF NOT EXISTS idx_recibos_edificio_unidad ON recibos(edificio_id, unidad);
CREATE INDEX IF NOT EXISTS idx_recibos_edificio_mes ON recibos(edificio_id, mes);

-- Tabla balances
CREATE INDEX IF NOT EXISTS idx_balances_edificio_mes ON balances(edificio_id, mes DESC);
