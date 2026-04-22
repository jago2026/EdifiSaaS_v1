import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://edifi-saa-s-v1.vercel.app";
const ADMIN_EMAIL = "correojago@gmail.com";

async function logSincronizacion(supabase: any, edificioId: string, tipo: string, estado: string, movimientosNuevos: number = 0, error: string | null = null, detalles: any = null) {
  try {
    await supabase.from("sincronizaciones").insert({
      edificio_id: edificioId,
      tipo,
      estado,
      movimientos_nuevos: movimientosNuevos,
      error,
      detalles
    });
  } catch (e) {
    console.error("Error logging sincronizacion:", e);
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resultados = [];

  try {
    const { data: edificios, error: edErr } = await supabase
      .from("edificios")
      .select("id, usuario_id, nombre, cron_enabled, cron_time, cron_frequency");

    if (edErr) throw edErr;

    console.log(`[CRON] Iniciando proceso para ${edificios?.length || 0} edificios`);

    for (const edificio of edificios) {
      const edificioId = edificio.id;
      console.log(`[CRON] Procesando edificio: ${edificio.nombre} (ID: ${edificioId})`);

      if (edificio.cron_enabled === false) {
        console.log(`[CRON] Saltando ${edificio.nombre} - servicio desactivado`);
        await logSincronizacion(supabase, edificioId, "cron_diario", "saltado", 0, "Servicio desactivado en configuración");
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: "cron_enabled = false" });
        continue;
      }

      try {
        // 1. Sincronización
        console.log(`[CRON] Ejecutando sync para ${edificio.nombre}`);
        await logSincronizacion(supabase, edificioId, "sync", "iniciando", 0, null, { fecha: new Date().toISOString() });
        
        const syncRes = await fetch(`${BASE_URL}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: edificio.usuario_id })
        });

        const syncData = await syncRes.json();
        
        if (!syncRes.ok) {
          const errorMsg = syncData.error || "Fallo en sincronización";
          console.error(`[CRON] Error en sync ${edificio.nombre}:`, errorMsg);
          await logSincronizacion(supabase, edificioId, "sync", "error", 0, errorMsg);
          throw new Error(errorMsg);
        }

        const syncMovimientos = syncData.stats?.total || 0;
        await logSincronizacion(supabase, edificioId, "sync", "completado", syncMovimientos, null, syncData.stats);
        console.log(`[CRON] Sync completado para ${edificio.nombre}: ${syncMovimientos} movimientos`);

        // 2. Envío de Email
        console.log(`[CRON] Enviando email para ${edificio.nombre}`);
        await logSincronizacion(supabase, edificioId, "email_diario", "iniciando", 0, null, { recipients_badge: false });

        const emailRes = await fetch(`${BASE_URL}/api/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edificioId: edificio.id })
        });

        const emailData = await emailRes.json();
        
        if (!emailRes.ok) {
          const errorMsg = emailData.error || "Fallo en envío de email";
          console.error(`[CRON] Error en email ${edificio.nombre}:`, errorMsg);
          await logSincronizacion(supabase, edificioId, "email_diario", "error", 0, errorMsg);
          
          // Insertar alerta
          await supabase.from("alertas").insert({
            edificio_id: edificioId,
            tipo: "error",
            titulo: "⚠️ Error en Envío de Email Diario",
            descripcion: errorMsg,
            fecha: new Date().toISOString().split("T")[0]
          });
          
          throw new Error(errorMsg);
        }

        await logSincronizacion(supabase, edificioId, "email_diario", "completado", 0, null, { recipient: emailData.recipient });
        console.log(`[CRON] Email enviado para ${edificio.nombre} a ${emailData.recipient}`);

        resultados.push({ 
          edificio: edificio.nombre, 
          status: "success", 
          syncMovimientos,
          emailRecipient: emailData.recipient 
        });

      } catch (err: any) {
        console.error(`[CRON] Error general para ${edificio.nombre}:`, err.message);
        
        // Notificar error al admin
        try {
          await fetch(`${BASE_URL}/api/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              action: "error_notification",
              edificioId: edificio.id,
              error: err.message,
              recipient: ADMIN_EMAIL
            })
          });
        } catch (e) {
          console.error(`[CRON] No se pudo notificar error al admin`);
        }

        resultados.push({ edificio: edificio.nombre, status: "error", error: err.message });
      }
    }

    console.log(`[CRON] Proceso completado. Resultados:`, resultados);
    return NextResponse.json({ success: true, results: resultados, total: resultados.length });

  } catch (error: any) {
    console.error("[CRON] Error general:", error);
    return NextResponse.json({ error: error.message, results: resultados }, { status: 500 });
  }
}
