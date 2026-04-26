-- Migración para añadir configuración de dashboard y alertas personalizadas
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{
  "cf": true,
  "mo": true,
  "cg": true,
  "usd": true,
  "br": true,
  "hs": true
}';

ALTER TABLE edificios ADD COLUMN IF NOT EXISTS alert_thresholds JSONB DEFAULT '{
  "saldo_bajo": 500,
  "variacion_gastos": 15,
  "whatsapp_enabled": true
}';

COMMENT ON COLUMN edificios.dashboard_config IS 'Configuración de módulos visibles en el dashboard por rol';
COMMENT ON COLUMN edificios.alert_thresholds IS 'Umbrales para alertas financieras personalizadas';
