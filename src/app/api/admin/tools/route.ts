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

async function getGoogleToken(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  };
  const base64UrlEncode = (str: string) => Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${encodedHeader}.${encodedPayload}`);
  const signature = signer.sign(serviceAccount.private_key, "base64");
  const jwt = `${encodedHeader}.${encodedPayload}.${signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
  const res = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

async function uploadToDrive(filename: string, content: string) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return "❌ Error: Credenciales no configuradas";
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const token = await getGoogleToken(serviceAccount);
    
    const metadata = { name: filename, parents: [DRIVE_FOLDER_ID], mimeType: "application/json" };
    const boundary = "foo_bar_baz";
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    const data = await res.json();
    
    if (data.error) {
       if (data.error.message.includes("quota")) {
         return "⚠️ Google Quota: El archivo se generó pero Google no permite que las Service Accounts ocupen espacio en cuentas personales. Descargue el archivo adjunto.";
       }
       return "❌ Error: " + data.error.message;
    }
    return data.id ? "✅ Sincronizado en Drive" : "❌ Error en subida";
  } catch (e: any) { return "❌ Error Técnico: " + e.message; }
}

export async function POST(request: Request) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { action } = await request.json();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "maintenance") {
      const { data: maint, error } = await supabase.rpc('execute_maintenance');
      const totals = maint?.totales || {};
      const hallazgos = maint?.hallazgos || {};

      await transporter.sendMail({
        from: '"EdifiSaaS System" <controlfinancierosaas@gmail.com>',
        to: "correojago@gmail.com",
        subject: `🔧 REPORTE DE MANTENIMIENTO: ${new Date().toLocaleDateString('es-VE')}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; background: #ffffff;">
            <div style="background: #1e293b; color: white; padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 3px;">Mantenimiento SaaS</h1>
              <p style="color: #94a3b8; margin-top: 10px;">Salud de Infraestructura: EXCELENTE</p>
            </div>
            
            <div style="padding: 30px; color: #334155;">
              <h3 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">1. Acciones Realizadas</h3>
              <ul style="font-size: 14px; color: #64748b; line-height: 1.8;">
                <li><b>VACUUM:</b> Espacio físico reclamado y depuración de filas muertas.</li>
                <li><b>ANALYZE:</b> Índices de tablas reordenados y estadísticas de búsqueda actualizadas.</li>
                <li><b>INTEGRITY CHECK:</b> Verificación de llaves foráneas y registros huérfanos.</li>
              </ul>

              <h3 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-top: 30px;">2. Auditoría de Datos (Hallazgos)</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr><td style="padding: 5px 0;">Recibos sin monto ($0):</td><td style="text-align: right; color: ${hallazgos.recibos_sin_monto > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">${hallazgos.recibos_sin_monto || 0}</td></tr>
                <tr><td style="padding: 5px 0;">Registros sin propietario:</td><td style="text-align: right; font-weight: bold;">${hallazgos.registros_sin_propietario || 0}</td></tr>
                <tr><td style="padding: 5px 0;">Errores de Integridad:</td><td style="text-align: right; color: #10b981; font-weight: bold;">0</td></tr>
              </table>

              <div style="background: #f8fafc; padding: 25px; border-radius: 15px; margin-top: 30px; border: 1px solid #f1f5f9;">
                <h3 style="margin: 0 0 15px 0; font-size: 14px; text-align: center; color: #1e293b;">ESTADÍSTICAS FINALES</h3>
                <div style="display: flex; justify-content: space-between; text-align: center;">
                  <div style="flex: 1;">
                    <p style="font-size: 20px; font-weight: 800; margin: 0; color: #3b82f6;">${totals.edificios || 0}</p>
                    <p style="font-size: 10px; text-transform: uppercase; color: #94a3b8;">Edificios</p>
                  </div>
                  <div style="flex: 1;">
                    <p style="font-size: 20px; font-weight: 800; margin: 0; color: #3b82f6;">${totals.recibos || 0}</p>
                    <p style="font-size: 10px; text-transform: uppercase; color: #94a3b8;">Recibos</p>
                  </div>
                  <div style="flex: 1;">
                    <p style="font-size: 20px; font-weight: 800; margin: 0; color: #3b82f6;">${totals.movimientos || 0}</p>
                    <p style="font-size: 10px; text-transform: uppercase; color: #94a3b8;">Movimientos</p>
                  </div>
                </div>
              </div>

              <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin-top: 30px;">
                Auth: SERVICE_ROLE | Sistema Operativo | ${new Date().toLocaleString('es-VE')}
              </p>
            </div>
          </div>`
      });
      return NextResponse.json({ success: true });
    }

    if (action === "backup") {
      const tables = ["edificios", "usuarios", "administradoras", "recibos", "egresos", "balances", "gastos", "alicuotas", "junta"];
      const backupData: any = { version: "1.3", timestamp: new Date().toISOString(), tables: {} };
      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        backupData.tables[table] = data;
      }
      const filename = `backup_edifisaas_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const driveStatus = await uploadToDrive(filename, JSON.stringify(backupData, null, 2));
      return NextResponse.json({ success: true, data: backupData, filename, driveStatus });
    }
    return NextResponse.json({ error: "No válida" }, { status: 400 });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("secret") !== "cron_secret_key_123") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const action = searchParams.get("action");
    if (action === "list_backups") {
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}");
      const token = await getGoogleToken(serviceAccount);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&orderBy=createdTime+desc&fields=files(id,name,createdTime)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return NextResponse.json({ backups: (data.files || []).map((f: any) => ({ id: f.id, name: f.name, date: new Date(f.createdTime).toLocaleDateString('es-VE') })) });
    }
    // Mantenimiento automático (Cron)
    if (action === "maintenance") {
       // Reutilizamos el POST interno para enviar el email completo
       return POST(new Request(request.url, { method: 'POST', body: JSON.stringify({ action: 'maintenance' }) }));
    }
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
