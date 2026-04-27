import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

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

async function logAlerta(supabase: any, edificioId: string, tipo: string, titulo: string, descripcion: string) {
  try {
    await supabase.from("alertas").insert({
      edificio_id: edificioId,
      tipo,
      titulo,
      descripcion,
      fecha: new Date().toISOString().split("T")[0]
    });
  } catch (e) {
    console.error("Error logging alerta:", e);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const force = searchParams.get('force') === 'true';
  
  const authHeader = request.headers.get('authorization');
  if (!force && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Detectar BASE_URL dinámicamente
  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const BASE_URL = `${protocol}://${host}`;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resultados = [];

  try {
    const { data: edificios, error: edErr } = await supabase
      .from("edificios")
      .select("id, usuario_id, nombre, cron_enabled, cron_time, cron_frequency, plan");

    if (edErr) throw edErr;

    console.log(`[CRON] ${force ? 'FORCE ' : ''}Iniciando proceso para ${edificios?.length || 0} edificios. BASE_URL: ${BASE_URL}`);

    // Obtener hora actual en Venezuela
    const nowVET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Caracas" }));
    const currentHourVET = nowVET.getHours();
    const currentFullTimeVET = nowVET.toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour12: false });
    const todayVET = nowVET.toISOString().split("T")[0];

    for (const edificio of edificios) {
      const edificioId = edificio.id;
      const cronTime = edificio.cron_time || "05:00";
      const configHour = parseInt(cronTime.split(":")[0]);

      // Verificar si ya corrió hoy (usando ultima_sincronizacion de edificios)
      const { data: edFull } = await supabase.from("edificios").select("ultima_sincronizacion").eq("id", edificioId).single();
      const lastSync = edFull?.ultima_sincronizacion ? new Date(new Date(edFull.ultima_sincronizacion).toLocaleString("en-US", { timeZone: "America/Caracas" })).toISOString().split("T")[0] : null;
      const alreadyRunToday = lastSync === todayVET;

      console.log(`[CRON] Edificio: ${edificio.nombre} | Config: ${cronTime} VET | Ahora: ${currentFullTimeVET} VET | Ya corrió hoy: ${alreadyRunToday}`);

      if (!edificio.cron_enabled) {
        console.log(`[CRON] [!] Saltando ${edificio.nombre} - Cron DESACTIVADO en config`);
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: "cron_enabled = false" });
        continue;
      }

      // Lógica flexible: 
      // 1. Si es forzado.
      // 2. Si es la hora exacta (configHour).
      // 3. Si ya pasó la hora (currentHourVET > configHour) y NO ha corrido hoy.
      const isTime = currentHourVET === configHour;
      const isPastTimeAndNotRun = currentHourVET > configHour && !alreadyRunToday;

      if (!force && !isTime && !isPastTimeAndNotRun) {
        console.log(`[CRON] [.] Saltando ${edificio.nombre} - No es el momento (Ahora: ${currentHourVET}, Config: ${configHour}, Ya corrió: ${alreadyRunToday})`);
        
        // Solo registrar debug si no ha corrido hoy y estamos antes de la hora, o si ya corrió y estamos después
        if (!alreadyRunToday || isTime) {
           // No saturar con logs si todo está bien
        }

        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: `No es el momento` });
        continue;
      }

      if (alreadyRunToday && !force) {
        console.log(`[CRON] [!] Saltando ${edificio.nombre} - Ya se ejecutó hoy (${lastSync})`);
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: "Ya se ejecutó hoy" });
        continue;
      }

      console.log(`[CRON] [EXECUTING] Disparando tareas para ${edificio.nombre}...`);
      await logAlerta(supabase, edificioId, "info", "🚀 Ejecutando Cron", `Iniciando sincronización y envío de informe diario (${currentFullTimeVET} VET).`);

      try {
        await logAlerta(supabase, edificioId, "info", "🚀 Iniciando Cron Diario", `Iniciando proceso automático de sincronización y envío de informes (${force ? 'Ejecución Forzada' : 'Ejecución Programada'}).`);

        // 1. Sincronización
        console.log(`[CRON] Ejecutando sync para ${edificio.nombre}`);
        await logSincronizacion(supabase, edificioId, "sync", "iniciando", 0, null, { fecha: new Date().toISOString(), mode: "cron" });
        
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
          await logAlerta(supabase, edificioId, "error", "❌ Fallo en Sincronización Automática", `Error: ${errorMsg}`);
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
          await logAlerta(supabase, edificioId, "error", "⚠️ Error en Envío de Email Diario", errorMsg);
          throw new Error(errorMsg);
        }

        await logSincronizacion(supabase, edificioId, "email_diario", "completado", 0, null, { recipient: emailData.recipient });
        await logAlerta(supabase, edificioId, "success", "✅ Cron Completado", `Sincronización exitosa (${syncMovimientos} mov.) e informe enviado a: ${emailData.recipient}`);
        
        console.log(`[CRON] Email enviado para ${edificio.nombre} a ${emailData.recipient}`);

        // 3. Consulta de Servicios Públicos (Si el plan lo permite)
        if (edificio.plan !== 'Esencial') {
          console.log(`[CRON] Disparando consulta de servicios para ${edificio.nombre}`);
          await fetch(`${BASE_URL}/api/servicios-publicos/cron`, {
            method: "GET", // Note: the SP cron is a GET
            headers: { "Authorization": authHeader || "" }
          });
        }

        resultados.push({ 
          edificio: edificio.nombre, 
          status: "success", 
          syncMovimientos,
          emailRecipient: emailData.recipient 
        });

      } catch (err: any) {
        console.error(`[CRON] Error general para ${edificio.nombre}:`, err.message);
        await logAlerta(supabase, edificioId, "error", "🚨 Error Crítico en Cron", `El proceso falló: ${err.message}`);
        
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

    return NextResponse.json({ 
      success: true, 
      vet_time: currentFullTimeVET,
      results: resultados, 
      total: resultados.length 
    });

  } catch (error: any) {
    console.error("[CRON] Error general:", error);
    return NextResponse.json({ error: error.message, results: resultados }, { status: 500 });
  }
}
