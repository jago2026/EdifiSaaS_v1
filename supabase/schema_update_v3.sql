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
