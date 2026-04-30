// CRON EXECUTOR - EdifiSaaS v1.0.2 (Claude fix: timing, logging, diagnostics)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST as syncPOST } from "../sync/route";
import { POST as emailPOST } from "../email/route";
import { GET as spCronGET } from "../servicios-publicos/cron/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

const ADMIN_EMAIL = "correojago@gmail.com";

async function logSincronizacion(supabase: any, edificioId: string, tipo: string, estado: string, movimientosNuevos: number = 0, error: string | null = null, detalles: any = null) {
  try {
    const { error: insertErr } = await supabase.from("sincronizaciones").insert({
      edificio_id: edificioId,
      tipo,
      estado,
      movimientos_nuevos: movimientosNuevos,
      error,
      detalles
    });
    if (insertErr) {
      console.error("[CRON][logSincronizacion] Error al insertar en sincronizaciones:", JSON.stringify(insertErr));
    }
  } catch (e) {
    console.error("[CRON][logSincronizacion] Excepción:", e);
  }
}

async function logAlerta(supabase: any, edificioId: string, tipo: string, titulo: string, descripcion: string) {
  try {
    const { error: insertErr } = await supabase.from("alertas").insert({
      edificio_id: edificioId,
      tipo,
      titulo,
      descripcion,
      fecha: new Date().toISOString().split("T")[0]
    });
    if (insertErr) {
      console.error("[CRON][logAlerta] Error al insertar alerta en BD:", JSON.stringify(insertErr));
      console.error("[CRON][logAlerta] Datos que intentó insertar:", { edificioId, tipo, titulo, descripcion });
    } else {
      console.log(`[CRON][logAlerta] ✅ Alerta registrada OK: [${tipo}] ${titulo}`);
    }
  } catch (e) {
    console.error("[CRON][logAlerta] Excepción inesperada:", e);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const force = searchParams.get('force') === 'true';
  
  const authHeader = request.headers.get('authorization');
  if (!force && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[CRON] ❌ Unauthorized: authHeader no coincide con CRON_SECRET.");
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // ── Hora Venezuela (UTC-4, sin cambio de horario) ──────────────────────────
  const nowUTC = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const vetTimeParts = formatter.formatToParts(nowUTC);
  const vetH = vetTimeParts.find(p => p.type === 'hour')?.value ?? '00';
  const vetM = vetTimeParts.find(p => p.type === 'minute')?.value ?? '00';
  const vetS = vetTimeParts.find(p => p.type === 'second')?.value ?? '00';
  const currentHourVET = parseInt(vetH, 10);
  const currentFullTimeVET = `${vetH}:${vetM}:${vetS}`;
  const utcTimeStr = nowUTC.toISOString();

  console.log("==========================================================");
  console.log(`[CRON] 🕐 Ejecución iniciada`);
  console.log(`[CRON] UTC  : ${utcTimeStr}`);
  console.log(`[CRON] VET  : ${currentFullTimeVET} (America/Caracas)`);
  console.log(`[CRON] Modo : ${force ? '⚡ FORZADO (force=true)' : '⏱ PROGRAMADO (Vercel Cron)'}`);
  console.log(`[CRON] CRON_SECRET configurado: ${process.env.CRON_SECRET ? 'SÍ' : 'NO (sin autenticación)'}`);
  console.log(`[CRON] SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
  console.log("==========================================================");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resultados = [];

  try {
    const { data: edificios, error: edErr } = await supabase
      .from("edificios")
      .select("id, usuario_id, nombre, cron_enabled, cron_time, cron_frequency");

    if (edErr) {
      console.error("[CRON] ❌ Error al obtener edificios de Supabase:", JSON.stringify(edErr));
      throw edErr;
    }

    console.log(`[CRON] 🏢 Edificios encontrados en BD: ${edificios?.length || 0}`);
    if (edificios && edificios.length > 0) {
      edificios.forEach((e: any) => {
        console.log(`[CRON]   → "${e.nombre}" | cron_enabled=${e.cron_enabled} | cron_time=${e.cron_time}`);
      });
    }

    if (!edificios || edificios.length === 0) {
      console.log("[CRON] ⚠️ No se encontraron edificios para procesar.");
      return NextResponse.json({ success: true, message: "No buildings found" });
    }

    // ── Servicios Públicos: solo a las 05:00 VET o si es forzado ──────────────
    if (force || currentHourVET === 5) {
      console.log("[CRON] 🔌 Ejecutando Cron de Servicios Públicos...");
      try {
        const spReq = new NextRequest(new Request("http://localhost/api/servicios-publicos/cron"));
        await spCronGET(spReq);
        console.log("[CRON] 🔌 Cron de Servicios Públicos completado OK.");
      } catch (spErr) {
        console.error("[CRON] 🔌 Error en Cron de Servicios Públicos:", spErr);
      }
    }

    for (const edificio of edificios) {
      const edificioId = edificio.id;
      const cronTime = edificio.cron_time || "05:00";
      const configHour = parseInt(cronTime.split(":")[0], 10);

      console.log("----------------------------------------------------------");
      console.log(`[CRON] 🏢 Procesando: "${edificio.nombre}"`);
      console.log(`[CRON]    cron_enabled  : ${edificio.cron_enabled}`);
      console.log(`[CRON]    cron_time cfg : ${cronTime} VET (hora configurada: ${configHour})`);
      console.log(`[CRON]    hora actual   : ${currentHourVET} VET (${currentFullTimeVET})`);
      console.log(`[CRON]    force         : ${force}`);

      if (!edificio.cron_enabled) {
        const msg = `Cron DESACTIVADO para "${edificio.nombre}". Hora VET actual: ${currentFullTimeVET}. Activa la automatización en Configuración para recibir informes diarios.`;
        console.log(`[CRON] ⚠️ ${msg}`);
        await logAlerta(supabase, edificioId, "warning", "⚠️ Cron Desactivado — Sin Ejecución",
          `${msg} | UTC: ${utcTimeStr}`);
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: "cron_enabled = false" });
        continue;
      }

      if (!force && currentHourVET !== configHour) {
        const msg = `Hora no coincide para "${edificio.nombre}": hora VET actual=${currentHourVET}h, hora configurada=${configHour}h (${cronTime}). El cron se ejecutará automáticamente a las ${cronTime} VET (${configHour + 4}:00 UTC según schedule de Vercel).`;
        console.log(`[CRON] ⏭ ${msg}`);
        // Registrar skip detallado en alertas para diagnóstico (solo 1 vez por día)
        await logAlerta(supabase, edificioId, "info", "⏭ Cron — Hora No Coincide (normal)",
          `${msg} | Hora UTC actual: ${utcTimeStr} | Schedule Vercel: 0 9 * * * (09:00 UTC = 05:00 VET)`);
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: `Hora no coincide (VET actual=${currentHourVET} != configurado=${configHour})` });
        continue;
      }

      console.log(`[CRON] 🚀 EJECUTANDO tareas para "${edificio.nombre}"...`);
      await logAlerta(supabase, edificioId, "info", "🚀 Iniciando Cron Diario",
        `Iniciando proceso automático. Hora VET: ${currentFullTimeVET} | UTC: ${utcTimeStr} | Modo: ${force ? 'Forzado' : 'Programado'}`);

      try {
        // ── 1. Sincronización ────────────────────────────────────────────────
        console.log(`[CRON] 🔄 [1/2] Ejecutando sync para "${edificio.nombre}"...`);
        await logSincronizacion(supabase, edificioId, "sync", "iniciando", 0, null,
          { fecha: utcTimeStr, mode: force ? "force" : "cron", vet_time: currentFullTimeVET });

        const syncReq = new Request("http://localhost/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: edificio.usuario_id })
        });

        let syncRes, syncData;
        try {
          syncRes = await syncPOST(syncReq);
          syncData = await syncRes.json();
          console.log(`[CRON] 🔄 Sync response status: ${syncRes.status} | ok: ${syncRes.ok}`);
          console.log(`[CRON] 🔄 Sync data:`, JSON.stringify(syncData).substring(0, 300));
        } catch (syncCallErr: any) {
          const errMsg = `Excepción al llamar /api/sync: ${syncCallErr?.message || JSON.stringify(syncCallErr)}`;
          console.error(`[CRON] ❌ ${errMsg}`);
          await logSincronizacion(supabase, edificioId, "sync", "error", 0, errMsg);
          await logAlerta(supabase, edificioId, "error", "❌ Error Crítico en Sync", errMsg);
          throw new Error(errMsg);
        }

        if (!syncRes.ok) {
          const errorMsg = `Sync falló (HTTP ${syncRes.status}): ${syncData?.error || JSON.stringify(syncData)}`;
          console.error(`[CRON] ❌ ${errorMsg}`);
          await logSincronizacion(supabase, edificioId, "sync", "error", 0, errorMsg, syncData);
          await logAlerta(supabase, edificioId, "error", "❌ Fallo en Sincronización", errorMsg);
          throw new Error(errorMsg);
        }

        const syncMovimientos = syncData?.stats?.total || 0;
        await logSincronizacion(supabase, edificioId, "sync", "completado", syncMovimientos, null, syncData?.stats);
        console.log(`[CRON] ✅ Sync OK para "${edificio.nombre}": ${syncMovimientos} movimientos nuevos.`);

        // ── 2. Envío de Email ─────────────────────────────────────────────────
        console.log(`[CRON] 📧 [2/2] Enviando email para "${edificio.nombre}"...`);
        await logSincronizacion(supabase, edificioId, "email_diario", "iniciando", 0, null,
          { vet_time: currentFullTimeVET, utc: utcTimeStr });

        const emailReq = new Request("http://localhost/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edificioId: edificio.id })
        });

        let emailRes, emailData;
        try {
          emailRes = await emailPOST(emailReq);
          emailData = await emailRes.json();
          console.log(`[CRON] 📧 Email response status: ${emailRes.status} | ok: ${emailRes.ok}`);
          console.log(`[CRON] 📧 Email data:`, JSON.stringify(emailData).substring(0, 300));
        } catch (emailCallErr: any) {
          const errMsg = `Excepción al llamar /api/email: ${emailCallErr?.message || JSON.stringify(emailCallErr)}`;
          console.error(`[CRON] ❌ ${errMsg}`);
          await logSincronizacion(supabase, edificioId, "email_diario", "error", 0, errMsg);
          await logAlerta(supabase, edificioId, "error", "❌ Error Crítico en Envío Email", errMsg);
          throw new Error(errMsg);
        }

        if (!emailRes.ok) {
          const errorMsg = `Email falló (HTTP ${emailRes.status}): ${emailData?.error || JSON.stringify(emailData)}`;
          console.error(`[CRON] ❌ ${errorMsg}`);
          await logSincronizacion(supabase, edificioId, "email_diario", "error", 0, errorMsg, emailData);
          await logAlerta(supabase, edificioId, "error", "⚠️ Error en Envío de Email Diario",
            `${errorMsg} | Verifica que email_junta esté configurado y que las credenciales SMTP sean válidas.`);
          throw new Error(errorMsg);
        }

        await logSincronizacion(supabase, edificioId, "email_diario", "completado", 0, null,
          { recipient: emailData?.recipient });
        await logAlerta(supabase, edificioId, "success", "✅ Cron Completado Exitosamente",
          `Sincronización: ${syncMovimientos} movimientos nuevos. Email enviado a: ${emailData?.recipient || '(sin destinatario)'} | VET: ${currentFullTimeVET} | UTC: ${utcTimeStr}`);

        console.log(`[CRON] ✅ Email enviado para "${edificio.nombre}" a: ${emailData?.recipient}`);
        resultados.push({
          edificio: edificio.nombre,
          status: "success",
          syncMovimientos,
          emailRecipient: emailData?.recipient
        });

      } catch (err: any) {
        const errorDetail = err?.message || JSON.stringify(err);
        console.error(`[CRON] 🚨 Error crítico para "${edificio.nombre}":`, errorDetail);
        await logAlerta(supabase, edificioId, "error", "🚨 Error Crítico en Cron",
          `Proceso falló para "${edificio.nombre}": ${errorDetail} | VET: ${currentFullTimeVET} | UTC: ${utcTimeStr}`);

        // Notificar al admin
        try {
          const adminEmailReq = new Request("http://localhost/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "error_notification",
              edificioId: edificio.id,
              error: errorDetail,
              recipient: ADMIN_EMAIL
            })
          });
          await emailPOST(adminEmailReq);
          console.log(`[CRON] 📧 Notificación de error enviada al admin (${ADMIN_EMAIL})`);
        } catch (notifyErr) {
          console.error("[CRON] ⚠️ No se pudo notificar el error al admin:", notifyErr);
        }

        resultados.push({ edificio: edificio.nombre, status: "error", error: errorDetail });
      }
    }

    console.log("==========================================================");
    console.log(`[CRON] 🏁 Ejecución finalizada. Resultados: ${JSON.stringify(resultados)}`);
    console.log("==========================================================");

    return NextResponse.json({
      success: true,
      utc_time: utcTimeStr,
      vet_time: currentFullTimeVET,
      results: resultados,
      total: resultados.length
    });

  } catch (error: any) {
    console.error("[CRON] 💥 Error general catastrófico:", error);
    return NextResponse.json({ error: error.message, results: resultados }, { status: 500 });
  }
}
