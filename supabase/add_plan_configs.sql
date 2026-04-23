-- 1. Create plan_configs table
CREATE TABLE IF NOT EXISTS plan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(12, 2) NOT NULL,
  price_yearly DECIMAL(12, 2) NOT NULL,
  unit_limit INTEGER,
  features JSONB DEFAULT '[]',
  is_popular BOOLEAN DEFAULT false,
  badge VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default plans if table is empty
INSERT INTO plan_configs (name, price_monthly, price_yearly, unit_limit, features, is_popular, badge, display_order)
SELECT 'Básico', 15.00, 150.00, 30, '["Sincronización Diaria", "Reportes Básicos", "App de Propietarios", "Hasta 30 Unidades"]', false, 'Starter', 1
WHERE NOT EXISTS (SELECT 1 FROM plan_configs WHERE name = 'Básico');

INSERT INTO plan_configs (name, price_monthly, price_yearly, unit_limit, features, is_popular, badge, display_order)
SELECT 'Profesional', 25.00, 250.00, 50, '["Todo lo de Básico", "Auditoría Financiera", "Reportes Avanzados", "Exportar PDF/Excel", "Hasta 50 Unidades"]', true, 'Más Popular', 2
WHERE NOT EXISTS (SELECT 1 FROM plan_configs WHERE name = 'Profesional');

INSERT INTO plan_configs (name, price_monthly, price_yearly, unit_limit, features, is_popular, badge, display_order)
SELECT 'Empresarial', 45.00, 450.00, 0, '["Todo lo de Profesional", "Unidades Ilimitadas", "Soporte Prioritario", "Custom Branding"]', false, 'Enterprise', 3
WHERE NOT EXISTS (SELECT 1 FROM plan_configs WHERE name = 'Empresarial');

INSERT INTO plan_configs (name, price_monthly, price_yearly, unit_limit, features, is_popular, badge, display_order)
SELECT 'IA', 60.00, 600.00, 0, '["Todo lo de Empresarial", "Asistente de IA", "Análisis Predictivo", "Automatización de Tareas"]', false, 'Futurista', 4
WHERE NOT EXISTS (SELECT 1 FROM plan_configs WHERE name = 'IA');

-- 3. Ensure buildings have plan column and set defaults for old ones
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'Básico';

UPDATE edificios SET plan = 'Básico' WHERE plan IS NULL OR plan = '';
UPDATE edificios SET plan = 'Básico' WHERE plan = 'basico';
