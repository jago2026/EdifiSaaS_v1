-- 1. Create plan_configs table
CREATE TABLE IF NOT EXISTS plan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(12, 2) NOT NULL,
  price_yearly DECIMAL(12, 2) NOT NULL,
  unit_limit INTEGER,
  features JSONB DEFAULT '[]',
  is_popular BOOLEAN DEFAULT false,
  show_contact BOOLEAN DEFAULT false,
  badge_text VARCHAR(100) DEFAULT '',
  badge VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default plans if not exist, update if already exist
-- Básico
INSERT INTO plan_configs (name, price_monthly, price_yearly, unit_limit, features, is_popular, show_contact, badge_text, badge, display_order)
SELECT 'Básico', 19.00, 190.00, 30,
  '["Sincronización Diaria", "Reporte diario automatico a los miembros de la Junta de Condominio con la situacion financiera", "Reportes Básicos", "Historial de 3 meses", "Soporte por email", "Hasta 30 Unidades"]'::jsonb,
  false, false, '', 'Starter', 0
WHERE NOT EXISTS (SELECT 1 FROM plan_configs WHERE name = 'Básico');

UPDATE plan_configs SET
  price_monthly = 19.00, price_yearly = 190.00, unit_limit = 30,
  features = '["Sincronización Diaria", "Reporte diario automatico a los miembros de la Junta de Condominio con la situacion financiera", "Reportes Básicos", "Historial de 3 meses", "Soporte por email", "Hasta 30 Unidades"]'::jsonb,
  is_popular = false, show_contact = false, badge_text = '', display_order = 0, updated_at = NOW()
WHERE name = 'Básico';

-- Profesional
INSERT INTO plan_configs (name, price_monthly, price_yearly, unit_limit, features, is_popular, show_contact, badge_text, badge, display_order)
SELECT 'Profesional', 29.00, 290.00, 50,
  '["Todo lo de Básico", "Control financiero avanzado", "Reporte diario automatico a los miembros de la Junta de Condominio con la situacion financiera", "Historial de 12 meses", "Exportación de reportes", "Auditoría Financiera", "Reportes Avanzados", "Hasta 50 Unidades"]'::jsonb,
  true, false, 'Más popular', 'Más Popular', 1
WHERE NOT EXISTS (SELECT 1 FROM plan_configs WHERE name = 'Profesional');

UPDATE plan_configs SET
  price_monthly = 29.00, price_yearly = 290.00, unit_limit = 50,
  features = '["Todo lo de Básico", "Control financiero avanzado", "Reporte diario automatico a los miembros de la Junta de Condominio con la situacion financiera", "Historial de 12 meses", "Exportación de reportes", "Auditoría Financiera", "Reportes Avanzados", "Hasta 50 Unidades"]'::jsonb,
  is_popular = true, show_contact = false, badge_text = 'Más popular', display_order = 1, updated_at = NOW()
WHERE name = 'Profesional';

-- Empresarial
INSERT INTO plan_configs (name, price_monthly, price_yearly, unit_limit, features, is_popular, show_contact, badge_text, badge, display_order)
SELECT 'Empresarial', 59.00, 590.00, 0,
  '["Todo lo de Profesional", "Unidades Ilimitadas", "Soporte Prioritario", "Actualizaciones y mejoras incluidas", "Formación in situ"]'::jsonb,
  false, false, '', 'Enterprise', 2
WHERE NOT EXISTS (SELECT 1 FROM plan_configs WHERE name = 'Empresarial');

UPDATE plan_configs SET
  price_monthly = 59.00, price_yearly = 590.00, unit_limit = 0,
  features = '["Todo lo de Profesional", "Unidades Ilimitadas", "Soporte Prioritario", "Actualizaciones y mejoras incluidas", "Formación in situ"]'::jsonb,
  is_popular = false, show_contact = false, badge_text = '', display_order = 2, updated_at = NOW()
WHERE name = 'Empresarial';

-- IA (En Desarrollo)
INSERT INTO plan_configs (name, price_monthly, price_yearly, unit_limit, features, is_popular, show_contact, badge_text, badge, display_order)
SELECT 'IA (En Desarrollo. actualmente no disponible)', 79.00, 790.00, 0,
  '["Todo lo de Empresarial", "Asistente de IA", "Análisis Predictivo", "Reportes inteligentes automatizados", "Todo incluido", "Análisis y recomendaciones", "Análisis de morosidad, de gastos, proyecciones y estimaciones, y mucho mas.", "Soporte", "Formación in situ"]'::jsonb,
  false, false, 'En Desarrollo', 'En Desarrollo', 3
WHERE NOT EXISTS (SELECT 1 FROM plan_configs WHERE name IN ('IA', 'Inteligencia Artificial (IA)', 'IA (En Desarrollo. actualmente no disponible)'));

UPDATE plan_configs SET
  name = 'IA (En Desarrollo. actualmente no disponible)',
  price_monthly = 79.00, price_yearly = 790.00, unit_limit = 0,
  features = '["Todo lo de Empresarial", "Asistente de IA", "Análisis Predictivo", "Reportes inteligentes automatizados", "Todo incluido", "Análisis y recomendaciones", "Análisis de morosidad, de gastos, proyecciones y estimaciones, y mucho mas.", "Soporte", "Formación in situ"]'::jsonb,
  is_popular = false, show_contact = false, badge_text = 'En Desarrollo', display_order = 3, updated_at = NOW()
WHERE name IN ('IA', 'Inteligencia Artificial (IA)', 'IA (En Desarrollo. actualmente no disponible)');

-- 3. Ensure buildings have plan column and set defaults for old ones
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'Básico';

UPDATE edificios SET plan = 'Básico' WHERE plan IS NULL OR plan = '';
UPDATE edificios SET plan = 'Básico' WHERE plan = 'basico';
