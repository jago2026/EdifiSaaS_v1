-- 17. Control Diario (Fotografía diaria post-sincronización)
CREATE TABLE IF NOT EXISTS control_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  dia_semana VARCHAR(10),
  saldo_inicial_bs DECIMAL(12, 2) DEFAULT 0,
  saldo_inicial_usd DECIMAL(12, 2) DEFAULT 0,
  ingresos_bs DECIMAL(12, 2) DEFAULT 0,
  ingresos_usd DECIMAL(12, 2) DEFAULT 0,
  egresos_bs DECIMAL(12, 2) DEFAULT 0,
  egresos_usd DECIMAL(12, 2) DEFAULT 0,
  ajustes_bs DECIMAL(12, 2) DEFAULT 0,
  ajustes_usd DECIMAL(12, 2) DEFAULT 0,
  saldo_final_bs DECIMAL(12, 2) DEFAULT 0,
  saldo_final_usd DECIMAL(12, 2) DEFAULT 0,
  tasa_cambio DECIMAL(12, 6) DEFAULT 0,
  recibos_pendientes INTEGER DEFAULT 0,
  delta_saldo_bs DECIMAL(12, 2) DEFAULT 0,
  fondo_reserva_bs DECIMAL(12, 2) DEFAULT 0,
  fondo_reserva_usd DECIMAL(12, 2) DEFAULT 0,
  fondo_dif_camb_bs DECIMAL(12, 2) DEFAULT 0,
  fondo_dif_camb_usd DECIMAL(12, 2) DEFAULT 0,
  fondo_int_mor_bs DECIMAL(12, 2) DEFAULT 0,
  fondo_int_mor_usd DECIMAL(12, 2) DEFAULT 0,
  total_fondos_bs DECIMAL(12, 2) DEFAULT 0,
  total_fondos_usd DECIMAL(12, 2) DEFAULT 0,
  disponibilidad_total_bs DECIMAL(12, 2) DEFAULT 0,
  disponibilidad_total_usd DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_control_diario_fecha ON control_diario(fecha DESC);

-- 18. Gastos Recurrentes
CREATE TABLE IF NOT EXISTS gastos_recurrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  codigo VARCHAR(20),
  descripcion TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, codigo)
);
-- Agregar columna sync_balance a edificios si no existe
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS sync_balance BOOLEAN DEFAULT true;
