-- Script para configurar el entorno DEMO en EdifiSaaS_v1
-- Este script crea un usuario demo, un edificio demo y clona datos anonimizados

-- 1. Variables de Identificación (IDs fijos para el entorno demo)
-- Usuario Demo: 00000000-0000-0000-0000-000000000000
-- Edificio Demo: d0000000-0000-0000-0000-000000000001

-- 2. Crear Usuario Demo (Clave: demo)
INSERT INTO usuarios (id, email, password_hash, first_name, last_name)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'demo', 
  '2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea', 
  'Usuario', 
  'Demostración'
) ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 3. Crear Edificio Demo
INSERT INTO edificios (
  id, nombre, direccion, unidades, usuario_id, status, plan, activo, 
  monthly_fee, payment_day, notes
) VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Residencial Demo (Anonimizado)',
  'Av. Principal, Urbanización Las Mercedes, Caracas',
  40,
  '00000000-0000-0000-0000-000000000000',
  'Demo',
  'premium',
  true,
  50.00,
  5,
  'Edificio de pruebas con datos reales anonimizados.'
) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- 4. FUNCIÓN PARA CLONAR Y ANONIMIZAR (Ejecutar esto para poblar la demo desde un ID real)
-- Reemplazar 'TU_ID_REAL' por el UUID de un edificio con buena data antes de ejecutar.

/*
-- EJEMPLO DE CLONACIÓN DE ALICUOTAS
INSERT INTO alicuotas (edificio_id, unidad, propietario, alicuota, email1, sincronizado)
SELECT 
    'd0000000-0000-0000-0000-000000000001',
    unidad,
    'Propietario ' || unidad, -- Anonimizado
    alicuota,
    'propietario' || unidad || '@ejemplo.com',
    true
FROM alicuotas WHERE edificio_id = 'TU_ID_REAL';

-- EJEMPLO DE CLONACIÓN DE EGRESOS
INSERT INTO egresos (edificio_id, fecha, mes, beneficiario, descripcion, monto, hash, sincronizado)
SELECT 
    'd0000000-0000-0000-0000-000000000001',
    fecha, mes,
    'Proveedor de Servicios ' || (floor(random() * 5 + 1))::text, -- Anonimizado
    'Mantenimiento Operativo Mensual',
    monto,
    md5(random()::text), -- Evitar duplicados
    true
FROM egresos WHERE edificio_id = 'TU_ID_REAL'
LIMIT 100;

-- CLONACIÓN DE BALANCES
INSERT INTO balances (edificio_id, mes, fecha, saldo_anterior, cobranza_mes, gastos_facturados, saldo_disponible, sincronizado)
SELECT 
    'd0000000-0000-0000-0000-000000000001',
    mes, fecha, saldo_anterior, cobranza_mes, gastos_facturados, saldo_disponible, true
FROM balances WHERE edificio_id = 'TU_ID_REAL'
ON CONFLICT DO NOTHING;
*/
