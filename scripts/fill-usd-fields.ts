/**
 * Script para calcular y rellenar los campos USD en la tabla historico_cobranza
 *
 * Ejecutar con: npx ts-node scripts/fill-usd-fields.ts
 * o integrado como endpoint API: /api/admin/fill-usd-fields
 *
 * Este script calcula los montos en USD dividiendo los montos en Bs por la tasa de cambio
 * almacenada en cada registro de historico_cobranza.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: Faltan credenciales de Supabase");
  console.error("Necesitas configurar NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fillUsdFields(edificioId?: string) {
  console.log("🔄 Iniciando cálculo de campos USD en historico_cobranza...\n");

  try {
    // Query base para obtener todos los registros de historico_cobranza
    let query = supabase
      .from("historico_cobranza")
      .select("*")
      .order("fecha", { ascending: true });

    if (edificioId) {
      query = query.eq("edificio_id", edificioId);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("❌ Error consultando datos:", error);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log("⚠️ No se encontraron registros en historico_cobranza");
      return;
    }

    console.log(`📊 Encontrados ${rows.length} registros para procesar\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        const tasa = Number(row.tasa_cambio) || 1;

        if (tasa <= 0 || tasa > 1000) {
          console.log(`⚠️ Registro ${row.id} tiene tasa inválida: ${tasa}, saltando...`);
          continue;
        }

        // Calcular campos USD dividiendo los campos en Bs entre la tasa
        const updateData: Record<string, number> = {};

        // monto_pagado_hoy_usd
        const montoPagadoHoy = Number(row.monto_pagado_hoy) || 0;
        updateData.monto_pagado_hoy_usd = Number((montoPagadoHoy / tasa).toFixed(2));

        // monto_pendiente_total_usd
        const montoPendienteTotal = Number(row.monto_pendiente_total) || 0;
        updateData.monto_pendiente_total_usd = Number((montoPendienteTotal / tasa).toFixed(2));

        // Campos individuales por cantidad de recibos (1-11)
        for (let i = 1; i <= 11; i++) {
          const montoBs = Number(row[`monto_${i}_recibo`]) || 0;
          updateData[`monto_${i}_recibo_usd`] = Number((montoBs / tasa).toFixed(2));
        }

        // monto_12_mas_recibo_usd
        const monto12mas = Number(row.monto_12_mas_recibo) || 0;
        updateData.monto_12_mas_recibo_usd = Number((monto12mas / tasa).toFixed(2));

        // Actualizar en la base de datos
        const { error: updateError } = await supabase
          .from("historico_cobranza")
          .update(updateData)
          .eq("id", row.id);

        if (updateError) {
          console.error(`❌ Error actualizando registro ${row.id}:`, updateError);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount % 100 === 0) {
            console.log(`  ✅ Actualizados ${updatedCount} registros...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error procesando registro ${row.id}:`, err);
        errorCount++;
      }
    }

    console.log("\n✅ Proceso completado");
    console.log(`   - Registros actualizados: ${updatedCount}`);
    console.log(`   - Errores: ${errorCount}`);
    console.log("\n📝 Ahora el código puede usar directamente los campos *_usd");

  } catch (err) {
    console.error("❌ Error general:", err);
  }
}

// Ejecutar si se llama directamente
const args = process.argv.slice(2);
const edificioId = args[0] || undefined;

fillUsdFields(edificioId).then(() => {
  console.log("\n🏁 Script finalizado");
  process.exit(0);
}).catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});

export { fillUsdFields };