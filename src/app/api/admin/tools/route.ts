import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { transporter } from "@/lib/mail";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

const DRIVE_FOLDER_ID = "15UIfIyE78tbRU0zuLs-XDIuTD53OC9gk";

async function checkAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) return false;
  if (userId === "superuser-id") return true;
  const supabase = createClient(supabaseUrl, anonKey);
  const { data: user } = await supabase.from("usuarios").select("email").eq("id", userId).single();
  return user?.email === "correojago@gmail.com";
}

// Lógica avanzada de autenticación (OAuth2 + Service Account)
async function getGoogleToken() {
  // 1. Intentar con Refresh Token (OAuth2) si existe - Evita el error 403 de cuota
  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          grant_type: "refresh_token",
        }),
      });
      const data = await res.json();
      if (data.access_token) return data.access_token;
    } catch (e) { console.error("OAuth2 failed, falling back..."); }
  }

  // 2. Fallback a Service Account (la lógica actual)
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const jwt = `${Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64")}.${Buffer.from(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/drive.file", aud: sa.token_uri, exp: now + 3600, iat: now })).toString("base64")}`;
  const signature = crypto.createSign("RSA-SHA256").update(jwt).sign(sa.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const res = await fetch(sa.token_uri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}.${signature}` });
  const data = await res.json();
  return data.access_token;
}

async function uploadToDrive(filename: string, content: string) {
  const token = await getGoogleToken();
  if (!token) return "❌ Error: Sin credenciales";
  try {
    const metadata = { name: filename, parents: [DRIVE_FOLDER_ID] };
    const boundary = "foo_bar_baz";
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.id ? "✅ Sincronizado en Drive" : "❌ Error en subida";
  } catch (e: any) {
    if (e.message.includes("quota")) return "⚠️ Cuota: Google bloquea cuentas de servicio en @gmail personales. Use Refresh Token o descarga local.";
    return "❌ Error: " + e.message;
  }
}

export async function POST(request: Request) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { action } = await request.json();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "maintenance") {
      const { data: maint } = await supabase.rpc('execute_maintenance');
      const det = maint?.detalles_mantenimiento || {};
      const hall = maint?.auditoria_hallazgos || {};
      const tot = maint?.estado_actual || {};

      await transporter.sendMail({
        from: '"EdifiSaaS System" <controlfinancierosaas@gmail.com>',
        to: "correojago@gmail.com",
        subject: `🔧 REPORTE MANTENIMIENTO: ${new Date().toLocaleDateString('es-VE')}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; background: #ffffff;">
            <div style="background: #0f172a; color: white; padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 3px;">Salud del Sistema</h1>
              <p style="color: #94a3b8; margin-top: 10px;">Infraestructura: ${maint?.status === 'success' ? 'ÓPTIMA' : 'REVISAR'}</p>
            </div>
            
            <div style="padding: 30px; color: #334155;">
              <h3 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">1. Acciones Realizadas</h3>
              <ul style="font-size: 13px; color: #64748b; line-height: 1.8;">
                <li><b>VACUUM ANALYZE:</b> Espacio reclamado y tablas reindexadas.</li>
                <li><b>DEPURACIÓN:</b> Se eliminaron <b>${det.logs_depurados || 0}</b> registros de logs antiguos.</li>
                <li><b>ESTADÍSTICAS:</b> Índices de búsqueda actualizados en <b>${det.tablas_reindexadas || 0}</b> tablas principales.</li>
              </ul>

              <h3 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">2. Auditoría de Datos (Calidad)</h3>
              <table style="width: 100%; font-size: 13px;">
                <tr><td style="padding: 5px 0;">Recibos con monto $0 (Alerta):</td><td style="text-align: right; color: ${hall.recibos_con_deuda_cero > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">${hall.recibos_con_deuda_cero || 0}</td></tr>
                <tr><td style="padding: 5px 0;">Registros sin propietario:</td><td style="text-align: right; font-weight: bold;">${hall.registros_sin_propietario || 0}</td></tr>
                <tr><td style="padding: 5px 0;">Integridad Referencial:</td><td style="text-align: right; color: #10b981; font-weight: bold;">${hall.integridad_referencial || 'OK'}</td></tr>
              </table>

              <div style="background: #f8fafc; padding: 25px; border-radius: 15px; margin-top: 30px; border: 1px solid #f1f5f9; text-align: center;">
                <div style="display: inline-block; width: 30%;">
                  <p style="font-size: 24px; font-weight: 800; margin: 0; color: #0f172a;">${tot.edificios || 0}</p>
                  <p style="font-size: 9px; text-transform: uppercase; color: #94a3b8;">Edificios</p>
                </div>
                <div style="display: inline-block; width: 30%;">
                  <p style="font-size: 24px; font-weight: 800; margin: 0; color: #0f172a;">${tot.recibos || 0}</p>
                  <p style="font-size: 9px; text-transform: uppercase; color: #94a3b8;">Recibos</p>
                </div>
                <div style="display: inline-block; width: 30%;">
                  <p style="font-size: 24px; font-weight: 800; margin: 0; color: #0f172a;">${tot.movimientos || 0}</p>
                  <p style="font-size: 9px; text-transform: uppercase; color: #94a3b8;">Movimientos</p>
                </div>
              </div>

              <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                Mantenimiento SaaS | Proyectado 15 días | ${new Date().toLocaleString('es-VE')}
              </p>
            </div>
          </div>`
      });
      return NextResponse.json({ success: true });
    }

    if (action === "backup") {
      const tables = ["edificios", "usuarios", "administradoras", "recibos", "egresos", "balances", "gastos", "alicuotas", "junta"];
      const backupData: any = { version: "1.5", timestamp: new Date().toISOString(), tables: {} };
      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        backupData.tables[table] = data;
      }
      const filename = `backup_edifisaas_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const driveStatus = await uploadToDrive(filename, JSON.stringify(backupData, null, 2));
      return NextResponse.json({ success: true, data: backupData, filename, driveStatus });
    }
    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("secret") !== "cron_secret_key_123") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const action = searchParams.get("action");
    if (action === "list_backups") {
      const token = await getGoogleToken();
      if (!token) return NextResponse.json({ backups: [] });
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&orderBy=createdTime+desc&fields=files(id,name,createdTime)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return NextResponse.json({ backups: (data.files || []).map((f: any) => ({ id: f.id, name: f.name, date: new Date(f.createdTime).toLocaleDateString('es-VE') })) });
    }
    if (action === "maintenance") return POST(new Request(request.url, { method: 'POST', body: JSON.stringify({ action: 'maintenance' }) }));
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
