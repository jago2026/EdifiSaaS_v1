-- Agregar soporte para recuperación de contraseña
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

ALTER TABLE junta ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE junta ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Índices para búsqueda rápida de tokens
CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token ON usuarios(reset_token);
CREATE INDEX IF NOT EXISTS idx_junta_reset_token ON junta(reset_token);
