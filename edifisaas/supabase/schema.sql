-- =============================================
-- EDIFISAAS - SCHEMA COMPLETO
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tablas principales
CREATE TABLE configuracion (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id INTEGER NOT NULL,
  admin_provider TEXT NOT NULL DEFAULT 'laideal',
  admin_username TEXT NOT NULL,
  admin_password_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasa_cambio (
  id SERIAL PRIMARY KEY,
  fecha DATE UNIQUE NOT NULL,
  tasa_bcv NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE historial_recibos (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL,
  fecha BIGINT NOT NULL,
  unidad TEXT,
  propietario TEXT,
  monto NUMERIC(12,2) NOT NULL,
  concepto TEXT NOT NULL,
  periodo TEXT,
  hash TEXT UNIQUE NOT NULL,
  is_new BOOLEAN DEFAULT true,
  detected_at BIGINT,
  synced_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE historial_egresos (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL,
  fecha BIGINT NOT NULL,
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  categoria TEXT,
  proveedor TEXT,
  numero_factura TEXT,
  hash TEXT UNIQUE NOT NULL,
  is_new BOOLEAN DEFAULT true,
  detected_at BIGINT,
  synced_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE historial_gastos (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL,
  fecha BIGINT NOT NULL,
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  tipo TEXT,
  hash TEXT UNIQUE NOT NULL,
  is_new BOOLEAN DEFAULT true,
  detected_at BIGINT,
  synced_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE historial_balance (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL,
  fecha BIGINT NOT NULL,
  saldo NUMERIC(12,2) NOT NULL,
  ingresos_mes NUMERIC(12,2),
  egresos_mes NUMERIC(12,2),
  gastos_mes NUMERIC(12,2),
  hash TEXT UNIQUE NOT NULL,
  is_new BOOLEAN DEFAULT true,
  detected_at BIGINT,
  synced_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE control_diario (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL,
  fecha BIGINT NOT NULL,
  saldo NUMERIC(12,2),
  ingresos_dia NUMERIC(12,2),
  ingresos_mes NUMERIC(12,2),
  egresos_dia NUMERIC(12,2),
  egresos_mes NUMERIC(12,2),
  gastos_dia NUMERIC(12,2),
  gastos_mes NUMERIC(12,2),
  numero_recibos INTEGER DEFAULT 0,
  numero_egresos INTEGER DEFAULT 0,
  numero_gastos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alertas (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE log_proceso (
  id SERIAL PRIMARY KEY,
  building_id INTEGER,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL,
  mensaje TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_recibos_building_hash ON historial_recibos(building_id, hash);
CREATE INDEX idx_recibos_is_new ON historial_recibos(is_new);
CREATE INDEX idx_egresos_building_hash ON historial_egresos(building_id, hash);
CREATE INDEX idx_egresos_is_new ON historial_egresos(is_new);
CREATE INDEX idx_gastos_building_hash ON historial_gastos(building_id, hash);
CREATE INDEX idx_balance_building_hash ON historial_balance(building_id, hash);
CREATE INDEX idx_alertas_building ON alertas(building_id);
