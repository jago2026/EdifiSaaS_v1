import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST as consultarPOST } from "../consultar/route";
import { POST as emailPOST } from "../../email/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

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
  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const BASE_URL = `${protocol}://${host}`;

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Obtener fecha actual en Venezuela
  const nowVET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Caracas" }));
  const todayDay = nowVET.getDate();
  const todayFull = nowVET.toISOString().split('T')[0];

  try {
    // 1. Buscar configuraciones de servicios programadas para hoy
    const { data: configs, error: configErr } = await supabase
      .from("servicios_publicos_config")
      .select("*, edificios(nombre, plan)")
      .eq("dia_consulta", todayDay);

    if (configErr) throw configErr;

    console.log(`[SP-CRON] Encontradas ${configs?.length || 0} consultas programadas para hoy (Día ${todayDay})`);

    const resultados = [];

    for (const config of configs) {
      // Solo para plan Profesional o superior
      const plan = config.edificios?.plan || "Esencial";
      if (plan === "Esencial") continue;

      console.log(`[SP-CRON] Consultando ${config.tipo} (${config.identificador}) para ${config.edificios?.nombre}`);

      try {
        // Llamar a la API de consulta (Llamada Directa)
        const consultReq = new Request("http://localhost/api/servicios-publicos/consultar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: config.tipo, identificador: config.identificador })
        });
        
        const consultRes = await consultarPOST(consultReq);
        const data = await consultRes.json();
        
        // Si la consulta fue exitosa, enviar email (Llamada Directa)
        if (data.exitoso) {
          const emailReq = new Request("http://localhost/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "servicios_publicos_email", // Cambiado para coincidir con la acción en email/route.ts
              edificioId: config.edificio_id,
              tipoServicio: config.tipo,
              identificador: config.identificador,
              alias: config.alias,
              resultadoConsulta: data,
              destinatario: "junta" // Enviar a la junta por defecto en el cron
            })
          });
          await emailPOST(emailReq);
          await logAlerta(supabase, config.edificio_id, "info", `⚡ Consulta ${config.tipo.toUpperCase()} (Auto)`, `Consulta automática exitosa para ${config.alias || config.identificador}. Deuda: Bs. ${data.deuda}. Notificación enviada a la junta.`);
        } else {
          await logAlerta(supabase, config.edificio_id, "error", `❌ Fallo Consulta ${config.tipo.toUpperCase()} (Auto)`, `No se pudo obtener datos para ${config.alias || config.identificador}. Error: ${data.error || 'Desconocido'}`);
        }

        resultados.push({ id: config.id, status: data.exitoso ? "success" : "error", data });

      } catch (err: any) {
        console.error(`[SP-CRON] Error consultando ${config.id}:`, err.message);
        resultados.push({ id: config.id, status: "exception", error: err.message });
      }
    }

    return NextResponse.json({ success: true, processed: resultados.length, results: resultados });

  } catch (error: any) {
    console.error("[SP-CRON] Error general:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
