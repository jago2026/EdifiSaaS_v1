-- SCRIPT DE PRUEBA DEFINITIVO (EdifiSaaS)
-- Este script inserta la deuda de prueba en el edificio CORRECTO automáticamente.

DO $$
DECLARE
    v_edificio_id UUID;
    v_mes_actual TEXT := to_char(CURRENT_DATE, 'YYYY-MM');
BEGIN
    -- Intentamos obtener el edificio que tuvo la última actividad de alertas
    -- Esto asegura que insertamos el TEST-99 en el edificio que estás viendo en el Dashboard.
    SELECT edificio_id INTO v_edificio_id 
    FROM alertas 
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Si no hay alertas, usamos el primer edificio
    IF v_edificio_id IS NULL THEN
        SELECT id INTO v_edificio_id FROM edificios LIMIT 1;
    END IF;

    IF v_edificio_id IS NULL THEN
        RAISE NOTICE 'Error: No se encontró ningún edificio en la base de datos.';
    ELSE
        -- 1. Limpiar rastro previo por si acaso
        DELETE FROM recibos WHERE unidad = 'TEST-99' AND edificio_id = v_edificio_id;
        
        -- 2. Insertar la deuda de prueba
        INSERT INTO recibos (edificio_id, unidad, propietario, deuda, num_recibos, mes, sincronizado)
        VALUES (v_edificio_id, 'TEST-99', 'USUARIO DE PRUEBA (TEST)', 50.00, 1, v_mes_actual, false);
        
        RAISE NOTICE '✅ ÉXITO: Deuda de prueba insertada para TEST-99 en el edificio ID: %', v_edificio_id;
        RAISE NOTICE 'INSTRUCCIONES:';
        RAISE NOTICE '1. Espera 1 minuto a que Vercel termine de desplegar los cambios que acabo de subir.';
        RAISE NOTICE '2. Ve al Dashboard y haz clic en Sincronizar.';
        RAISE NOTICE '3. Deberías ver un log que dice: "Estado actual: DB Local (42 inmuebles...)"';
        RAISE NOTICE '4. Al finalizar, debería detectar: "✅ Deuda Cancelada (Auto) para TEST-99".';
    END IF;
END $$;
