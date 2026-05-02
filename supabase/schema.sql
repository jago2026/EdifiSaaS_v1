-- Tablas para CondominioSaaS v2
-- Ejecutar en Supabase SQL Editor
-- Usa CREATE TABLE IF NOT EXISTS para evitar errores si ya existen

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Edificios (enhanced with more fields)
CREATE TABLE IF NOT EXISTS edificios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  direccion TEXT,
  unidades INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  admin_id VARCHAR(255),
  admin_secret VARCHAR(255),
  url_login TEXT,
  url_recibos TEXT,
  url_egresos TEXT,
  url_gastos TEXT,
  url_balance TEXT,
  unidad_default VARCHAR(10),
  propietario_default VARCHAR(255),
  supabase_url TEXT,
  supabase_key TEXT,
  plan VARCHAR(50) DEFAULT 'basico',
  activo BOOLEAN DEFAULT true,
  ultima_sincronizacion TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'Prueba',
  monthly_fee DECIMAL(12, 2) DEFAULT 0,
  discount_pct INTEGER DEFAULT 0,
  payment_day INTEGER DEFAULT 5,
  last_payment_date DATE,
  last_payment_amount DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Recibos Pendientes (deudas por apartamento)
CREATE TABLE IF NOT EXISTS recibos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  unidad VARCHAR(50) NOT NULL,
  propietario VARCHAR(255),
  num_recibos INTEGER DEFAULT 0,
  deuda DECIMAL(12, 2) DEFAULT 0,
  deuda_usd DECIMAL(12, 2) DEFAULT 0,
  deuda_anterior DECIMAL(12, 2) DEFAULT 0,
  pagado DECIMAL(12, 2) DEFAULT 0,
  saldo DECIMAL(12, 2) DEFAULT 0,
  mes VARCHAR(7),
  actualizado_en DATE,
  sincronizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Egresos (pagos a proveedores y servicios externos - r=21)
CREATE TABLE IF NOT EXISTS egresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  mes VARCHAR(7),  -- Format: MM-YYYY for historical data
  beneficiario VARCHAR(255),
  descripcion TEXT,
  monto DECIMAL(12, 2) NOT NULL,
  documento VARCHAR(255),
  sincronizado BOOLEAN DEFAULT false,
  hash VARCHAR(64),  -- Para evitar duplicados: fecha+beneficiario+monto
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, hash)
);

-- 4b. Gastos (gastos operativos del edificio - r=3)
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  mes VARCHAR(7),  -- Format: MM-YYYY for historical data
  codigo VARCHAR(20),
  descripcion TEXT,
  monto DECIMAL(12, 2) NOT NULL,
  sincronizado BOOLEAN DEFAULT false,
  hash VARCHAR(64),  -- Para evitar duplicados: fecha+codigo+monto
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, hash)
);

-- 5. Balance (Estado financiero del edificio)
CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  mes VARCHAR(7),  -- Format: MM-YYYY for historical data
  fecha DATE NOT NULL,
  saldo_anterior DECIMAL(12, 2) DEFAULT 0,
  cobranza_mes DECIMAL(12, 2) DEFAULT 0,
  gastos_facturados DECIMAL(12, 2) DEFAULT 0,
  saldo_disponible DECIMAL(12, 2) DEFAULT 0,
  total_por_cobrar DECIMAL(12, 2) DEFAULT 0,
  recibos_mes INTEGER DEFAULT 0,
  condominios_atrasados INTEGER DEFAULT 0,
  condominios_sobrantes INTEGER DEFAULT 0,
  fondo_reserva DECIMAL(12, 2) DEFAULT 0,
  fondo_prestaciones DECIMAL(12, 2) DEFAULT 0,
  fondo_trabajos_varios DECIMAL(12, 2) DEFAULT 0,
  ajuste_alicuota DECIMAL(12, 2) DEFAULT 0,
  fondo_intereses DECIMAL(12, 2) DEFAULT 0,
  fondo_diferencial_cambiario DECIMAL(12, 2) DEFAULT 0,
  sincronizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, mes)
);

-- 6. Movimientos (histórico de movimientos)
CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recibo', 'egreso', 'gasto')),
  descripcion TEXT NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  fecha DATE NOT NULL,
  categoria VARCHAR(100),
  unidad_apartamento VARCHAR(50),
  propietario VARCHAR(255),
  referencia_externa VARCHAR(255),
  hash VARCHAR(64),  -- Para detectar cambios
  fecha_sincronizacion DATE,  -- Cuando se sincronizó
  sincronizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6b. Movimientos del día (nuevos movimientos detectados)
CREATE TABLE IF NOT EXISTS movimientos_dia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recibo', 'egreso', 'gasto')),
  descripcion TEXT NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  fecha DATE NOT NULL,
  unidad_apartamento VARCHAR(50),
  propietario VARCHAR(255),
  fuente VARCHAR(50),  -- 'recibos', 'egresos', 'gastos'
  detectado_en DATE DEFAULT CURRENT_DATE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Alertas
CREATE TABLE IF NOT EXISTS alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  leida BOOLEAN DEFAULT false,
  fecha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Logs de sincronización
CREATE TABLE IF NOT EXISTS sincronizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) DEFAULT 'sync',
  estado VARCHAR(50) NOT NULL,
  movimientos_nuevos INTEGER DEFAULT 0,
  error TEXT,
  detalles JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Alicuotas por apartamento
CREATE TABLE IF NOT EXISTS alicuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  unidad VARCHAR(10) NOT NULL,
  propietario VARCHAR(255),
  alicuota DECIMAL(12, 8) NOT NULL,
  email1 VARCHAR(255),
  email2 VARCHAR(255),
  telefono1 VARCHAR(50),
  telefono2 VARCHAR(50),
  observaciones TEXT,
  sincronizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, unidad)
);

-- 10. Tasas de cambio BCV históricas
CREATE TABLE IF NOT EXISTS tasas_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  tasa_dolar DECIMAL(12, 4) NOT NULL,
  tasa_euro DECIMAL(12, 4) DEFAULT 0,
  fuente VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columnas nuevas a edificios si no existen
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS url_login TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS url_recibos TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS url_recibo_mes TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS url_egresos TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS url_gastos TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS url_balance TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS unidad_default VARCHAR(10);
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS propietario_default VARCHAR(255);
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS ultima_sincronizacion TIMESTAMP WITH TIME ZONE;

-- Agregar columna propietario a movimientos si no existe
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS propietario VARCHAR(255);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_edificio ON movimientos(edificio_id);
CREATE INDEX IF NOT EXISTS idx_alertas_edificio ON alertas(edificio_id);
CREATE INDEX IF NOT EXISTS idx_edificio_usuario ON edificios(usuario_id);

-- Habilitar RLS en nuevas tablas
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para nuevas tablas
DROP POLICY IF EXISTS "Usuarios pueden ver recibos de sus edificios" ON recibos;
CREATE POLICY "Usuarios pueden ver recibos de sus edificios" ON recibos
  FOR SELECT USING (
    edificio_id IN (SELECT id FROM edificios WHERE usuario_id = auth.uid())
  );

DROP POLICY IF EXISTS "Usuarios pueden ver egresos de sus edificios" ON egresos;
CREATE POLICY "Usuarios pueden ver egresos de sus edificios" ON egresos
  FOR SELECT USING (
    edificio_id IN (SELECT id FROM edificios WHERE usuario_id = auth.uid())
  );

DROP POLICY IF EXISTS "Usuarios pueden ver balances de sus edificios" ON balances;
CREATE POLICY "Usuarios pueden ver balances de sus edificios" ON balances
  FOR SELECT USING (
    edificio_id IN (SELECT id FROM edificios WHERE usuario_id = auth.uid())
  );

-- 11. Movimientos manuales (registros manuales para cuadre de saldo)
CREATE TABLE IF NOT EXISTS movimientos_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  fecha_corte DATE NOT NULL,
  saldo_inicial DECIMAL(12, 2) DEFAULT 0,
  egresos DECIMAL(12, 2) DEFAULT 0,
  ingresos DECIMAL(12, 2) DEFAULT 0,
  saldo_final DECIMAL(12, 2) DEFAULT 0,
  obs_egresos TEXT,
  obs_ingresos TEXT,
  tasa_bcv DECIMAL(12, 4),
  saldo_final_usd DECIMAL(12, 2) DEFAULT 0,
  saldo_segun_administradora DECIMAL(12, 2),
  comparado BOOLEAN DEFAULT false,
  matcheado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columnas de configuración a edificios
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS saldo_inicial DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS saldo_inicial_usd DECIMAL(12, 2) DEFAULT 0;

-- Índices para nuevas tablas
CREATE INDEX IF NOT EXISTS idx_movimientos_manual_fecha ON movimientos_manual(fecha_corte DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_manual_edificio ON movimientos_manual(edificio_id);

-- 12. Detalle de recibos de condominio por mes
CREATE TABLE IF NOT EXISTS recibos_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  unidad VARCHAR(10) NOT NULL,
  propietario VARCHAR(255),
  mes VARCHAR(10) NOT NULL,
  codigo VARCHAR(10),
  descripcion TEXT,
  monto DECIMAL(12, 2) NOT NULL,
  cuota_parte DECIMAL(12, 4) DEFAULT 0,
  tipo VARCHAR(30) DEFAULT 'gasto_comun',
  sincronizado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, unidad, mes, codigo)
);

-- 13. Pagos de recibos detectados
CREATE TABLE IF NOT EXISTS pagos_recibos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  unidad VARCHAR(10) NOT NULL,
  propietario VARCHAR(255),
  mes VARCHAR(10) NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  fecha_pago DATE,
  fecha_deteccion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'web',
  verificado BOOLEAN DEFAULT false
);

-- 14. Fondo de reserva (10% de pagos)
CREATE TABLE IF NOT EXISTS fondo_reserva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  unidad VARCHAR(10) NOT NULL,
  mes VARCHAR(10) NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Miembros de la Junta
CREATE TABLE IF NOT EXISTS junta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  cargo VARCHAR(100),
  telefono VARCHAR(50),
  activo BOOLEAN DEFAULT true,
  recibe_email_cron BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, email)
);

-- Migración: agregar recibe_email_cron si no existe
ALTER TABLE junta ADD COLUMN IF NOT EXISTS recibe_email_cron BOOLEAN DEFAULT true;

-- IMPORTANTE: RLS está DESHABILITADO en esta tabla para permitir
-- que el service role key pueda actualizar preferencias sin restricciones
-- No habilitar Row Level Security en la tabla junta
ALTER TABLE junta DISABLE ROW LEVEL SECURITY;

-- Eliminar cualquier política RLS existente (por si se habilitó por error)
DROP POLICY IF EXISTS "junta_policy" ON junta;
DROP POLICY IF EXISTS "junta_view_policy" ON junta;
DROP POLICY IF EXISTS "junta_update_policy" ON junta;
DROP POLICY IF EXISTS "junta_insert_policy" ON junta;
DROP POLICY IF EXISTS "junta_delete_policy" ON junta;

-- 16. Logs de alertas y errores
CREATE TABLE IF NOT EXISTS alertas_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para nuevas tablas
CREATE INDEX IF NOT EXISTS idx_recibos_detalle_mes ON recibos_detalle(mes DESC);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos_recibos(fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_fondo_mes ON fondo_reserva(mes DESC);
CREATE INDEX IF NOT EXISTS idx_balances_mes ON balances(mes DESC);
CREATE INDEX IF NOT EXISTS idx_egresos_mes ON egresos(mes DESC);
CREATE INDEX IF NOT EXISTS idx_egresos_fecha ON egresos(fecha DESC);
ALTER TABLE balances ADD CONSTRAINT unique_edificio_mes UNIQUE (edificio_id, mes);
ALTER TABLE egresos ADD CONSTRAINT unique_edificio_fecha_beneficiario_monto UNIQUE (edificio_id, fecha, beneficiario, monto);
CREATE INDEX IF NOT EXISTS idx_junta_edificio ON junta(edificio_id);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas_log(created_at DESC);
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
-- 1. Agregar columna mes a recibos para permitir historicos
ALTER TABLE recibos ADD COLUMN IF NOT EXISTS mes VARCHAR(7);
CREATE INDEX IF NOT EXISTS idx_recibos_mes ON recibos(mes);

-- 2. Actualizar gastos_recurrentes con categoria
ALTER TABLE gastos_recurrentes ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'otros';
-- Asegurar que la tabla existe por si acaso
CREATE TABLE IF NOT EXISTS gastos_recurrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  codigo VARCHAR(20),
  descripcion TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  categoria VARCHAR(50) DEFAULT 'otros',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(edificio_id, codigo)
);
