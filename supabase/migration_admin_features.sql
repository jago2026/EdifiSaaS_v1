-- ============================================================
-- SCRIPT: Módulo de Administración Master (Auditoría, Pagos SaaS, Config)
-- ============================================================

-- 1. Tabla de Auditoría Global
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  user_email TEXT,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, etc.
  entity_type TEXT NOT NULL, -- edificio, plan, pago, etc.
  entity_id TEXT,
  data_before JSONB,
  data_after JSONB,
  status TEXT DEFAULT 'SUCCESS',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_building ON audit_logs(building_id);

-- 2. Tabla de Historial de Pagos de Edificios (Suscripciones SaaS)
CREATE TABLE IF NOT EXISTS saas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  fecha_pago DATE NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'USD',
  metodo_pago VARCHAR(50), -- Transferencia, Pago Móvil, Zelle, etc.
  referencia VARCHAR(100),
  comprobante_url TEXT,
  notas TEXT,
  verificado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_saas_payments_edificio ON saas_payments(edificio_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_fecha ON saas_payments(fecha_pago DESC);

-- 3. Tabla de Configuración Global del Sistema
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuraciones base
INSERT INTO system_config (key, value, description) VALUES
('maintenance_mode', 'false', 'Activa el modo mantenimiento global'),
('admin_email', 'correojago@gmail.com', 'Email principal del superadministrador'),
('trial_days', '15', 'Días de prueba para nuevos edificios'),
('support_whatsapp', '+584120000000', 'Número de soporte técnico')
ON CONFLICT (key) DO NOTHING;

-- 4. Columnas adicionales para edificios (Gestión SaaS)
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Prueba' CHECK (subscription_status IN ('Prueba', 'Activo', 'Suspendido', 'Cancelado', 'Vencido'));
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS trial_end_date DATE;

-- Inicializar trial_end_date para edificios existentes
UPDATE edificios SET trial_end_date = (created_at + INTERVAL '15 days')::DATE WHERE trial_end_date IS NULL;
