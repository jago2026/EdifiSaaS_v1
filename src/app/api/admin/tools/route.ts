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
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return "❌ Error: Variable no encontrada";
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const token = await getGoogleToken(serviceAccount);
    const metadata = { name: filename, parents: [DRIVE_FOLDER_ID] };
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
        return "❌ Error 403 (Cuota): Google no permite que las Service Accounts ocupen espacio en cuentas personales. Use un 'Shared Drive' o siga usando descarga local.";
      }
      return "❌ Google API Error: " + data.error.message;
    }
    return data.id ? "✅ Sincronizado con Drive" : "❌ Error desconocido";
  } catch (e: any) {
    return "❌ Error: " + e.message;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("secret") !== "cron_secret_key_123") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { count: edificios } = await supabase.from('edificios').select('*', { count: 'exact', head: true });
    
    await transporter.sendMail({
      from: '"EdifiSaaS Core" <controlfinancierosaas@gmail.com>',
      to: "correojago@gmail.com",
      subject: "🔧 [AUTO] Mantenimiento Ejecutado",
      html: `<p>Mantenimiento automático realizado. Edificios detectados: ${edificios ?? 0}</p>`
    });
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { action } = await request.json();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Conteo manual con captura de errores
    const { count: bCount, error: bErr } = await supabase.from('edificios').select('*', { count: 'exact', head: true });
    const { count: rCount, error: rErr } = await supabase.from('recibos').select('*', { count: 'exact', head: true });
    const { count: mCount, error: mErr } = await supabase.from('movimientos').select('*', { count: 'exact', head: true });

    if (action === "maintenance") {
      await supabase.rpc('execute_maintenance');
      await transporter.sendMail({
        from: '"EdifiSaaS Core" <controlfinancierosaas@gmail.com>',
        to: "correojago@gmail.com",
        subject: `🔧 Reporte de Mantenimiento Detallado`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
            <h1 style="color:#0f172a;">Estado del Sistema</h1>
            <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;">
              <p>🏢 <b>Edificios:</b> ${bCount !== null ? bCount : (bErr ? 'Error: '+bErr.message : '0')}</p>
              <p>📑 <b>Recibos:</b> ${rCount !== null ? rCount : (rErr ? 'Error: '+rErr.message : '0')}</p>
              <p>📊 <b>Movimientos:</b> ${mCount !== null ? mCount : (mErr ? 'Error: '+mErr.message : '0')}</p>
            </div>
            <p style="font-size:10px;color:#94a3b8;">Acceso: ${serviceRoleKey === anonKey ? 'ANON (Limitado)' : 'SERVICE_ROLE (Completo)'}</p>
          </div>`
      });
      return NextResponse.json({ success: true });
    }

    if (action === "backup") {
      const tables = ["edificios", "usuarios", "administradoras", "recibos", "egresos", "balances", "gastos", "alicuotas", "junta"];
      const backupData: any = { version: "1.2", timestamp: new Date().toISOString(), tables: {} };
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
