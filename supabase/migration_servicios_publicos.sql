-- Tabla para configuración de servicios públicos
CREATE TABLE IF NOT EXISTS servicios_publicos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cantv', 'hidrocapital', 'corpoelec')),
  identificador VARCHAR(50) NOT NULL, -- Número de teléfono, NIC, o NCC
  alias VARCHAR(100),
  dia_consulta INTEGER CHECK (dia_consulta >= 1 AND dia_consulta <= 31),
  activo BOOLEAN DEFAULT true,
  ultimo_monto DECIMAL(12, 2),
  ultima_consulta TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para histórico de consultas de servicios públicos
CREATE TABLE IF NOT EXISTS servicios_publicos_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES servicios_publicos_config(id) ON DELETE CASCADE,
  edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
  fecha_consulta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  monto DECIMAL(12, 2),
  recibos_pendientes INTEGER,
  estado VARCHAR(20) DEFAULT 'exitoso' CHECK (estado IN ('exitoso', 'error')),
  detalles JSONB,
  error_msg TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sp_config_edificio ON servicios_publicos_config(edificio_id);
CREATE INDEX IF NOT EXISTS idx_sp_consultas_config ON servicios_publicos_consultas(config_id);
CREATE INDEX IF NOT EXISTS idx_sp_consultas_fecha ON servicios_publicos_consultas(fecha_consulta DESC);

-- Habilitar RLS
ALTER TABLE servicios_publicos_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_publicos_consultas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Usuarios pueden ver config de sus edificios" ON servicios_publicos_config;
CREATE POLICY "Usuarios pueden ver config de sus edificios" ON servicios_publicos_config
  FOR SELECT USING (
    edificio_id IN (SELECT id FROM edificios WHERE usuario_id = auth.uid())
  );

DROP POLICY IF EXISTS "Usuarios pueden ver consultas de sus edificios" ON servicios_publicos_consultas;
CREATE POLICY "Usuarios pueden ver consultas de sus edificios" ON servicios_publicos_consultas
  FOR SELECT USING (
    edificio_id IN (SELECT id FROM edificios WHERE usuario_id = auth.uid())
  );
