import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * API para calcular y rellenar los campos USD en historico_cobranza
 *
 * POST /api/admin/fill-usd-fields
 *
 * Este endpoint calcula los montos en USD dividiendo los montos en Bs
 * por la tasa de cambio almacenada en cada registro.
 *
 * Se recomienda ejecutar una vez para poblar todos los campos *_usd
 * que ahora existen en la tabla historico_cobranza.
 */
export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Faltan credenciales de Supabase" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener parámetros opcionales de la request
    let edificioId: string | undefined;
    try {
      const body = await request.json();
      edificioId = body.edificioId;
    } catch {
      // Sin body, procesar todos los edificios
    }

    console.log("🔄 Iniciando cálculo de campos USD en historico_cobranza...");

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
      return NextResponse.json(
        { error: "Error consultando datos", details: error },
        { status: 500 }
      );
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: "No se encontraron registros en historico_cobranza", updated: 0 }
      );
    }

    console.log(`📊 Encontrados ${rows.length} registros para procesar`);

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const tasa = Number(row.tasa_cambio) || 0;

        // Validar tasa
        if (tasa <= 0 || tasa > 1000) {
          skippedCount++;
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
          errors.push(`ID ${row.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } catch (err: any) {
        errors.push(`ID ${row.id}: ${err?.message || "Error desconocido"}`);
      }
    }

    console.log(`✅ Proceso completado: ${updatedCount} actualizados, ${skippedCount} saltados`);

    return NextResponse.json({
      success: true,
      total: rows.length,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: "Campos USD calculados y actualizados correctamente"
    });

  } catch (err: any) {
    console.error("❌ Error general:", err);
    return NextResponse.json(
      { error: err?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}

// GET para verificar estado (sin ejecutar actualización)
export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Faltan credenciales de Supabase" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Contar registros y verificar qué campos USD están vacíos
    const { count } = await supabase
      .from("historico_cobranza")
      .select("*", { count: "exact", head: true });

    // Verificar un registro de ejemplo
    const { data: sample } = await supabase
      .from("historico_cobranza")
      .select("id, fecha, tasa_cambio, monto_pendiente_total, monto_pendiente_total_usd")
      .limit(1)
      .single();

    return NextResponse.json({
      totalRecords: count || 0,
      sampleRecord: sample,
      instructions: "Usa POST para ejecutar el cálculo y relleno de campos USD"
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}