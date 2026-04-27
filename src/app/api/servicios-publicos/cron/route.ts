import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

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
        // Llamar a la API de consulta
        const res = await fetch(`${BASE_URL}/api/servicios-publicos/consultar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ configId: config.id, edificioId: config.edificio_id })
        });

        const data = await res.json();
        
        // Si la consulta fue exitosa, enviar email
        if (data.exitoso) {
          await fetch(`${BASE_URL}/api/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "public_service_notification",
              edificioId: config.edificio_id,
              serviceType: config.tipo,
              identificador: config.identificador,
              alias: config.alias,
              monto: data.deuda,
              recibos: data.recibos,
              details: data
            })
          });
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
