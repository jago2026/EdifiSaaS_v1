import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// URL base de la aplicación (cambiar según despliegue)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://edifi-saa-s-v1.vercel.app";
const ADMIN_EMAIL = "correojago@gmail.com";

export async function GET(request: NextRequest) {
  // Verificar un token de seguridad para evitar ejecuciones no autorizadas
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Obtener todos los edificios configurados
    const { data: edificios, error: edErr } = await supabase
      .from("edificios")
      .select("id, usuario_id, nombre, cron_enabled, cron_time, cron_frequency");

    if (edErr) throw edErr;

    const results = [];

    for (const edificio of edificios) {
      if (edificio.cron_enabled === false) {
        console.log(`Cron: Saltando edificio ${edificio.nombre} (Servicio Desactivado)`);
        continue;
      }
      try {
        console.log(`Cron: Procesando edificio ${edificio.nombre} (${edificio.id})`);

        // 2. Ejecutar Sincronización
        // Nota: Llamamos a la API de sync simulando un POST
        const syncRes = await fetch(`${BASE_URL}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: edificio.usuario_id })
        });

        const syncData = await syncRes.json();
        if (!syncRes.ok) throw new Error(syncData.error || "Fallo en sincronización");

        // 3. Ejecutar Envío de Email
        const emailRes = await fetch(`${BASE_URL}/api/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edificioId: edificio.id })
        });

        const emailData = await emailRes.json();
        if (!emailRes.ok) throw new Error(emailData.error || "Fallo en envío de email");

        results.push({ edificio: edificio.nombre, status: "success" });

      } catch (err: any) {
        console.error(`Error en cron para edificio ${edificio.nombre}:`, err);
        
        // 4. Notificar error al administrador
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

          // También insertar en tabla de alertas para que se vea en el dashboard
          await supabase.from("alertas").insert({
            edificio_id: edificio.id,
            tipo: "error",
            titulo: "⚠️ Error en Cron Diario",
            descripcion: `El proceso automático falló: ${err.message}`,
            fecha: new Date().toISOString().split("T")[0]
          });
        } catch (e) {
          console.error("Fallo crítico: No se pudo enviar email de error al admin o crear alerta");
        }

        results.push({ edificio: edificio.nombre, status: "error", error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Cron error general:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
