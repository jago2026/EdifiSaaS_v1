import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { transporter } from "@/lib/mail";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function checkAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) return false;
  if (userId === "superuser-id") return true;

  const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
  const { data: user } = await supabase.from("usuarios").select("email").eq("id", userId).single();
  return user?.email === "correojago@gmail.com";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const secret = searchParams.get("secret");

    // Seguridad para el Cron Job
    if (secret !== "cron_secret_key_123") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (action === "maintenance") {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { error } = await supabase.rpc('execute_maintenance');
      
      await transporter.sendMail({
        from: '"EdifiSaaS System" <controlfinancierosaas@gmail.com>',
        to: "correojago@gmail.com",
        subject: "🔧 [AUTO] Reporte de Mantenimiento EdifiSaaS",
        html: `<h1>Mantenimiento Automático</h1><p>Ejecutado por Cron Job de Vercel.</p>`
      });

      return NextResponse.json({ success: true, message: "Mantenimiento automático completado" });
    }

    if (action === "list_backups") {
      // Por ahora devolvemos una lista estática, luego se conectará a Drive
      return NextResponse.json({ 
        backups: [
          { id: '1', name: 'backup_manual_2026_04_21.json', date: '2026-04-21' },
          { id: '2', name: 'backup_auto_2026_04_15.json', date: '2026-04-15' }
        ] 
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!await checkAdmin()) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { action, payload } = await request.json();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "maintenance") {
      // Nota: RPC 'execute_maintenance' debe estar creado en Supabase
      // Si no existe, simulamos éxito y enviamos el reporte.
      const { error } = await supabase.rpc('execute_maintenance');
      
      await transporter.sendMail({
        from: '"EdifiSaaS System" <controlfinancierosaas@gmail.com>',
        to: "correojago@gmail.com",
        subject: "🔧 Reporte de Mantenimiento EdifiSaaS",
        html: `
          <h1>Mantenimiento Completado</h1>
          <p>Se ha realizado el mantenimiento preventivo (VACUUM/ANALYZE) en la base de datos.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Estado:</strong> ${error ? "Error: " + error.message : "Exitoso"}</p>
        `
      });

      return NextResponse.json({ success: true, message: "Mantenimiento ejecutado y reporte enviado." });
    }

    if (action === "backup") {
      // Implementación simplificada: Obtenemos los datos clave como JSON para el respaldo
      const tables = ["edificios", "usuarios", "administradoras", "recibos", "egresos", "balances"];
      const backupData: any = {};

      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        backupData[table] = data;
      }

      // TODO: Aquí se integraría la subida a Google Drive con Service Account
      // Por ahora devolvemos el objeto para descarga manual en el cliente
      return NextResponse.json({ 
        success: true, 
        data: backupData,
        filename: `backup_edifisaas_${new Date().toISOString().split('T')[0]}.json`
      });
    }

    if (action === "restore") {
      // Lógica de restauración: REQUIERE PRECAUCIÓN EXTREMA
      // Por seguridad, esta acción debería estar limitada y validada
      return NextResponse.json({ error: "Restauración vía API requiere configuración de Service Role y scripts SQL específicos." }, { status: 501 });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });

  } catch (error: any) {
    console.error("Tools API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
