// CRON EXECUTOR - EdifiSaaS v1.0.3 (Claude fix: status filter, demo skip, login diagnostics)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST as syncPOST } from "../sync/route";
import { POST as emailPOST } from "../email/route";
import { GET as spCronGET } from "../servicios-publicos/cron/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

const ADMIN_EMAIL = "correojago@gmail.com";
const DEMO_EDIFICIO_ID = "d0000000-0000-0000-0000-000000000001";

// Estados que permiten ejecución del cron diario
const ESTADOS_ACTIVOS = ["Activo", "Prueba"];

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
    console.error("[CRON] Unauthorized: authHeader no coincide con CRON_SECRET.");
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Hora Venezuela (UTC-4, sin cambio de horario)
  const nowUTC = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Caracas',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const vetTimeParts = formatter.formatToParts(nowUTC);
  const vetH = vetTimeParts.find(p => p.type === 'hour')?.value ?? '00';
  const vetM = vetTimeParts.find(p => p.type === 'minute')?.value ?? '00';
  const vetS = vetTimeParts.find(p => p.type === 'second')?.value ?? '00';
  const currentHourVET = parseInt(vetH, 10);
  const currentFullTimeVET = `${vetH}:${vetM}:${vetS}`;
  const utcTimeStr = nowUTC.toISOString();

  console.log("==========================================================");
  console.log(`[CRON] Ejecucion iniciada | UTC: ${utcTimeStr} | VET: ${currentFullTimeVET}`);
  console.log(`[CRON] Modo: ${force ? 'FORZADO' : 'PROGRAMADO'} | CRON_SECRET: ${process.env.CRON_SECRET ? 'SI' : 'NO'}`);
  console.log("==========================================================");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resultados: any[] = [];

  try {
    const { data: edificios, error: edErr } = await supabase
      .from("edificios")
      .select("id, usuario_id, nombre, cron_enabled, cron_time, cron_frequency, status, url_login, admin_secret");

    if (edErr) {
      console.error("[CRON] Error al obtener edificios de Supabase:", JSON.stringify(edErr));
      throw edErr;
    }

    console.log(`[CRON] Edificios en BD: ${edificios?.length || 0}`);
    if (edificios) {
      edificios.forEach((e: any) => {
        console.log(`[CRON]   "${e.nombre}" | status=${e.status || 'N/A'} | cron_enabled=${e.cron_enabled} | cron_time=${e.cron_time}`);
      });
    }

    if (!edificios || edificios.length === 0) {
      return NextResponse.json({ success: true, message: "No buildings found" });
    }

    // Servicios Publicos: solo a las 05:00 VET o si es forzado
    if (force || currentHourVET === 5) {
      console.log("[CRON] Ejecutando Cron de Servicios Publicos...");
      try {
        const spReq = new NextRequest(new Request("http://localhost/api/servicios-publicos/cron"));
        await spCronGET(spReq);
        console.log("[CRON] Cron de Servicios Publicos completado OK.");
      } catch (spErr) {
        console.error("[CRON] Error en Cron de Servicios Publicos:", spErr);
      }
    }

    for (const edificio of edificios) {
      const edificioId = edificio.id;
      const cronTime = edificio.cron_time || "05:00";
      const configHour = parseInt(cronTime.split(":")[0], 10);
      const estadoEdificio = edificio.status || "Prueba";

      console.log("----------------------------------------------------------");
      console.log(`[CRON] "${edificio.nombre}" | status=${estadoEdificio} | cron_enabled=${edificio.cron_enabled} | hora_cfg=${configHour}h | hora_vet=${currentHourVET}h`);

      // 1. Saltar edificio Demo
      if (edificioId === DEMO_EDIFICIO_ID) {
        console.log(`[CRON] SKIP "${edificio.nombre}" — es el edificio Demo (nunca sincroniza).`);
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: "Demo building" });
        continue;
      }

      // 2. Saltar edificios con estado no permitido (Suspendido, Inactivo, etc.)
      if (!ESTADOS_ACTIVOS.includes(estadoEdificio)) {
        console.log(`[CRON] SKIP "${edificio.nombre}" — estado "${estadoEdificio}" no permite cron (solo Activo/Prueba).`);
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: `Estado: ${estadoEdificio}` });
        continue;
      }

      // 3. Cron desactivado en el edificio
      if (!edificio.cron_enabled) {
        console.log(`[CRON] SKIP "${edificio.nombre}" — cron_enabled=false.`);
        await logAlerta(supabase, edificioId, "warning", "Cron Desactivado",
          `El envio automatico de informes esta desactivado para este edificio. Activalo en Configuracion para recibir el informe diario. VET: ${currentFullTimeVET}`);
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: "cron_enabled = false" });
        continue;
      }

      // 4. Hora no coincide
      if (!force && currentHourVET !== configHour) {
        console.log(`[CRON] SKIP "${edificio.nombre}" — hora VET actual ${currentHourVET}h != hora configurada ${configHour}h.`);
        resultados.push({ edificio: edificio.nombre, status: "skipped", reason: `Hora no coincide (${currentHourVET} != ${configHour})` });
        continue;
      }

      // 5. Validacion previa de credenciales de login
      if (!edificio.url_login || !edificio.admin_secret) {
        const msg = `El edificio "${edificio.nombre}" no tiene URL de login o clave de administrador configurada. `
          + `Sin estas credenciales no es posible sincronizar con el sistema externo de cobranza. `
          + `Ve a Configuracion > Sincronizacion y verifica los datos del sistema externo. VET: ${currentFullTimeVET}`;
        console.error(`[CRON] ERROR "${edificio.nombre}" — credenciales faltantes: url_login=${!!edificio.url_login} | admin_secret=${!!edificio.admin_secret}`);
        await logAlerta(supabase, edificioId, "error", "Credenciales de Sincronizacion Faltantes", msg);
        resultados.push({ edificio: edificio.nombre, status: "error", reason: "Sin credenciales de login" });
        continue;
      }

      // EJECUTAR
      console.log(`[CRON] EJECUTANDO sync + email para "${edificio.nombre}" (Estado: ${estadoEdificio})...`);
      await logAlerta(supabase, edificioId, "info", "Iniciando Cron Diario",
        `Proceso automatico iniciado. Estado edificio: ${estadoEdificio} | VET: ${currentFullTimeVET} | UTC: ${utcTimeStr} | Modo: ${force ? 'Forzado' : 'Programado'}`);

      try {
        // 1. Sincronizacion
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
          console.log(`[CRON] Sync response: HTTP ${syncRes.status} | data: ${JSON.stringify(syncData).substring(0, 200)}`);
        } catch (syncCallErr: any) {
          const errMsg = `Excepcion al llamar /api/sync: ${syncCallErr?.message || JSON.stringify(syncCallErr)}`;
          console.error(`[CRON] ${errMsg}`);
          await logSincronizacion(supabase, edificioId, "sync", "error", 0, errMsg);
          await logAlerta(supabase, edificioId, "error", "Error en Sincronizacion", errMsg);
          throw new Error(errMsg);
        }

        let syncFailed = false;
        let syncFailedReason = "";
        let syncMovimientos = 0;

        if (!syncRes.ok) {
          const rawError = syncData?.error || JSON.stringify(syncData);
          syncFailed = true;
          syncFailedReason = rawError;
          let alertTitle = "Sincronización no disponible — Informe enviado con datos existentes";
          let alertDesc = `El sistema externo no respondió (HTTP ${syncRes.status}): ${rawError}. `
            + `Se envió igualmente el informe diario con los últimos datos disponibles en la base de datos. VET: ${currentFullTimeVET}`;

          if (rawError.toLowerCase().includes("login") || rawError.toLowerCase().includes("fallo login")) {
            alertTitle = "Fallo de Login en Sistema de Cobranza — Informe enviado con datos existentes";
            alertDesc = `No se pudo autenticar en el sistema externo de cobranza (posibles causas: URL incorrecta, clave cambiada o servidor caído). `
              + `URL configurada: ${edificio.url_login}. `
              + `Se envió de igual forma el informe diario con los últimos datos disponibles en la base de datos. `
              + `Para corregir: ve a Configuración y verifica las credenciales del sistema externo. `
              + `VET: ${currentFullTimeVET} | UTC: ${utcTimeStr}`;
          }

          console.warn(`[CRON] ⚠️ Sync falló para "${edificio.nombre}" — enviando email con datos disponibles. Error: ${rawError}`);
          await logSincronizacion(supabase, edificioId, "sync", "error_fallback", 0, rawError, syncData);
          await logAlerta(supabase, edificioId, "warning", alertTitle, alertDesc);
          // NO lanzar excepción — continuar al envío del email con datos de BD
        } else {
          syncMovimientos = syncData?.stats?.total || 0;
          await logSincronizacion(supabase, edificioId, "sync", "completado", syncMovimientos, null, syncData?.stats);
          console.log(`[CRON] Sync OK para "${edificio.nombre}": ${syncMovimientos} movimientos nuevos.`);
        }

        // 2. Envio de Email
        await logSincronizacion(supabase, edificioId, "email_diario", "iniciando", 0, null,
          { vet_time: currentFullTimeVET, utc: utcTimeStr });

        const emailReq = new Request("http://localhost/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edificioId: edificio.id, syncFailed, syncFailedReason })
        });

        let emailRes, emailData;
        try {
          emailRes = await emailPOST(emailReq);
          emailData = await emailRes.json();
          console.log(`[CRON] Email response: HTTP ${emailRes.status} | data: ${JSON.stringify(emailData).substring(0, 200)}`);
        } catch (emailCallErr: any) {
          const errMsg = `Excepcion al llamar /api/email: ${emailCallErr?.message || JSON.stringify(emailCallErr)}`;
          console.error(`[CRON] ${errMsg}`);
          await logSincronizacion(supabase, edificioId, "email_diario", "error", 0, errMsg);
          await logAlerta(supabase, edificioId, "error", "Error Critico en Envio Email", errMsg);
          throw new Error(errMsg);
        }

        if (!emailRes.ok) {
          const errorMsg = `Email fallo (HTTP ${emailRes.status}): ${emailData?.error || JSON.stringify(emailData)}`;
          console.error(`[CRON] ${errorMsg}`);
          await logSincronizacion(supabase, edificioId, "email_diario", "error", 0, errorMsg, emailData);
          await logAlerta(supabase, edificioId, "error", "Error en Envio de Informe Diario",
            `${errorMsg} | Verifica que haya miembros en la pestana Junta con email configurado. VET: ${currentFullTimeVET}`);
          throw new Error(errorMsg);
        }

        await logSincronizacion(supabase, edificioId, "email_diario", "completado", 0, null,
          { recipient: emailData?.recipient });

        // Ajustar el mensaje final si hubo fallback por fallo de sincronización
        const finalAlertTitle = syncFailed ? "Cron Diario Completado con Advertencias" : "Cron Diario Completado Exitosamente";
        const finalAlertTipo = syncFailed ? "warning" : "success";
        const finalAlertDesc = syncFailed 
          ? `Sincronización fallida (${syncFailedReason}). Se envió el informe con los últimos datos disponibles en base de datos. VET: ${currentFullTimeVET}`
          : `Sincronización: ${syncMovimientos} movimientos nuevos. Informe enviado a la Junta. VET: ${currentFullTimeVET} | UTC: ${utcTimeStr}`;

        await logAlerta(supabase, edificioId, finalAlertTipo, finalAlertTitle, finalAlertDesc);

        console.log(`[CRON] OK completado para "${edificio.nombre}".`);
        resultados.push({ edificio: edificio.nombre, status: "success", syncMovimientos });

      } catch (err: any) {
        const errorDetail = err?.message || JSON.stringify(err);
        console.error(`[CRON] ERROR CRITICO para "${edificio.nombre}":`, errorDetail);

        // Notificar al admin sin exponer detalles al usuario
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
        } catch (notifyErr) {
          console.error("[CRON] No se pudo notificar el error al admin:", notifyErr);
        }

        resultados.push({ edificio: edificio.nombre, status: "error", error: errorDetail });
      }
    }

    console.log("==========================================================");
    console.log(`[CRON] Ejecucion finalizada | Resultados: ${JSON.stringify(resultados)}`);
    console.log("==========================================================");

    return NextResponse.json({
      success: true,
      utc_time: utcTimeStr,
      vet_time: currentFullTimeVET,
      results: resultados,
      total: resultados.length
    });

  } catch (error: any) {
    console.error("[CRON] Error catastrofico:", error);
    return NextResponse.json({ error: error.message, results: resultados }, { status: 500 });
  }
}
