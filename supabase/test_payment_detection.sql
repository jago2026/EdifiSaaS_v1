-- SCRIPT DE PRUEBA DE DETECCIÓN DE PAGOS (EdifiSaaS)
-- Este script permite verificar si el sistema detecta pagos automáticos sin esperar al cron.

-- 1. INSERTAR DEUDA FICTICIA
-- Insertamos una deuda para una unidad de prueba 'TEST-99'. 
-- Al sincronizar, como esta unidad NO existe en el portal de la administradora, 
-- el sistema asumirá que "ya se pagó" (porque desapareció de la lista de deudores) 
-- y registrará el pago automáticamente.

DO $$
DECLARE
    v_edificio_id UUID;
    v_mes_actual TEXT := to_char(CURRENT_DATE, 'YYYY-MM');
BEGIN
    -- Obtener el primer edificio registrado (o puedes filtrar por nombre si prefieres)
    SELECT id INTO v_edificio_id FROM edificios LIMIT 1;

    IF v_edificio_id IS NULL THEN
        RAISE NOTICE 'No se encontró ningún edificio en la base de datos.';
    ELSE
        -- Insertar la deuda de prueba
        INSERT INTO recibos (edificio_id, unidad, propietario, deuda, num_recibos, mes, sincronizado)
        VALUES (v_edificio_id, 'TEST-99', 'USUARIO DE PRUEBA', 50.00, 1, v_mes_actual, false);
        
        RAISE NOTICE 'Deuda de prueba insertada para la unidad TEST-99 en el edificio %', v_edificio_id;
        RAISE NOTICE 'INSTRUCCIONES:';
        RAISE NOTICE '1. Ve al Dashboard del sistema.';
        RAISE NOTICE '2. Haz clic en el botón de Sincronizar (o Actualizar Datos).';
        RAISE NOTICE '3. Revisa la pestaña de 🔔 Alertas. Debería aparecer: "✅ Deuda Cancelada (Auto) para TEST-99".';
    END IF;
END $$;

-- 2. LIMPIEZA (Ejecutar DESPUÉS de probar la sincronización)
/*
DELETE FROM recibos WHERE unidad = 'TEST-99';
DELETE FROM pagos_recibos WHERE unidad = 'TEST-99';
DELETE FROM movimientos WHERE descripcion LIKE '%TEST-99%';
DELETE FROM movimientos_dia WHERE unidad_apartamento = 'TEST-99';
DELETE FROM alertas WHERE titulo LIKE '%TEST-99%' OR descripcion LIKE '%TEST-99%';
*/
